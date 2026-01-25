"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import {
  IconBold,
  IconItalic,
  IconList,
  IconPhoto,
  IconSend,
  IconLoader2,
  IconX,
} from "@tabler/icons-react";
import { MentionList, MentionListRef } from "./mention-list";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import {
  MAX_FILE_SIZE,
  ALLOWED_IMAGE_TYPES,
  isAllowedImageType,
  getFileSizeLimitText,
} from "@/lib/constants";

interface CommentEditorProps {
  taskId: Id<"tasks">;
  onSubmit?: () => void;
}

interface UploadedImage {
  storageId: Id<"_storage">;
  fileName: string;
  fileType: string;
  fileSize: number;
  previewUrl: string;
}

interface MentionUser {
  _id: string;
  name: string;
  avatarUrl?: string;
}

export function CommentEditor({ taskId, onSubmit }: CommentEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentionedUserIds = useRef<Set<string>>(new Set());

  // Use ref for handleSubmit to avoid stale closure in useEditor
  const handleSubmitRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const users = useQuery(api.users.listByOrg);
  const addComment = useMutation(api.activities.addComment);
  const generateUploadUrl = useMutation(api.activities.generateUploadUrl);
  const deleteUpload = useMutation(api.activities.deleteUpload);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: "Add a comment...",
      }),
      Mention.configure({
        HTMLAttributes: {
          class: "mention bg-primary/10 text-primary rounded px-1 font-medium",
        },
        suggestion: {
          items: ({ query }: { query: string }): MentionUser[] => {
            if (!users) return [];
            return users
              .filter((user) =>
                user.name.toLowerCase().includes(query.toLowerCase())
              )
              .slice(0, 5);
          },
          render: () => {
            let component: ReactRenderer<MentionListRef> | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart: (props: SuggestionProps<MentionUser>) => {
                component = new ReactRenderer(MentionList, {
                  props,
                  editor: props.editor as Editor,
                });

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },

              onUpdate(props: SuggestionProps<MentionUser>) {
                component?.updateProps(props);

                if (!props.clientRect || !popup) return;

                popup[0].setProps({
                  getReferenceClientRect: props.clientRect as () => DOMRect,
                });
              },

              onKeyDown(props: SuggestionKeyDownProps) {
                if (props.event.key === "Escape") {
                  popup?.[0].hide();
                  return true;
                }

                return component?.ref?.onKeyDown(props) ?? false;
              },

              onExit() {
                popup?.[0].destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[60px] px-3 py-2 focus:outline-none",
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          // Use ref to avoid stale closure
          handleSubmitRef.current?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Track whether editor has content for the Send button
      const text = editor.getText().trim();
      setHasContent(text.length > 0);

      // Track mentioned users
      mentionedUserIds.current.clear();
      const json = editor.getJSON();
      const extractMentions = (content: unknown[]) => {
        for (const node of content) {
          if (
            typeof node === "object" &&
            node !== null &&
            "type" in node
          ) {
            const typedNode = node as {
              type: string;
              attrs?: { id?: string };
              content?: unknown[];
            };
            if (typedNode.type === "mention" && typedNode.attrs?.id) {
              mentionedUserIds.current.add(typedNode.attrs.id);
            }
            if (typedNode.content) {
              extractMentions(typedNode.content);
            }
          }
        }
      };
      if (json.content) {
        extractMentions(json.content);
      }
    },
  });

  const handleImageUpload = useCallback(
    async (file: File) => {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File size must be ${getFileSizeLimitText()} or less`);
        return;
      }

      // Validate file type
      if (!isAllowedImageType(file.type)) {
        toast.error("Only image files are allowed (JPEG, PNG, GIF, WebP)");
        return;
      }

      setIsUploading(true);
      try {
        // Get upload URL
        const uploadUrl = await generateUploadUrl();

        // Upload file
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await result.json();

        // Create preview URL
        const previewUrl = URL.createObjectURL(file);

        setUploadedImages((prev) => [
          ...prev,
          {
            storageId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            previewUrl,
          },
        ]);
      } catch (error) {
        console.error("Failed to upload image:", error);
        toast.error("Failed to upload image");
      } finally {
        setIsUploading(false);
      }
    },
    [generateUploadUrl]
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const items = event.clipboardData.items;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            handleImageUpload(file);
          }
        }
      }
    },
    [handleImageUpload]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const files = event.dataTransfer.files;
      for (const file of files) {
        if (file.type.startsWith("image/")) {
          handleImageUpload(file);
        }
      }
    },
    [handleImageUpload]
  );

  const removeImage = useCallback(
    async (index: number) => {
      const image = uploadedImages[index];
      if (!image) return;

      // Revoke preview URL
      URL.revokeObjectURL(image.previewUrl);

      // Remove from state
      setUploadedImages((prev) => prev.filter((_, i) => i !== index));

      // Delete from storage
      try {
        await deleteUpload({ storageId: image.storageId });
      } catch (error) {
        console.error("Failed to delete upload:", error);
        // Don't show error to user - the image was removed from UI
      }
    },
    [uploadedImages, deleteUpload]
  );

  const handleSubmit = useCallback(async () => {
    if (!editor) return;

    const content = editor.getHTML();
    // Check if there's actual content
    if (!hasContent && uploadedImages.length === 0) return;

    setIsSubmitting(true);
    try {
      await addComment({
        taskId,
        content,
        mentionedUserIds: Array.from(mentionedUserIds.current) as Id<"users">[],
        attachmentIds: uploadedImages.map((img) => img.storageId),
      });

      // Clear editor
      editor.commands.clearContent();
      mentionedUserIds.current.clear();
      setHasContent(false);

      // Clean up preview URLs (don't delete from storage - they're now part of the comment)
      uploadedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
      setUploadedImages([]);

      toast.success("Comment added");
      onSubmit?.();
    } catch (error) {
      console.error("Failed to add comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  }, [editor, hasContent, uploadedImages, addComment, taskId, onSubmit]);

  // Update ref when handleSubmit changes
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Cleanup orphaned uploads on unmount
  useEffect(() => {
    return () => {
      // Clean up preview URLs
      uploadedImages.forEach((img) => {
        URL.revokeObjectURL(img.previewUrl);
        // Delete orphaned uploads from storage
        deleteUpload({ storageId: img.storageId }).catch(() => {
          // Ignore errors - best effort cleanup
        });
      });
    };
    // Only run on unmount, not when uploadedImages changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!editor) return null;

  return (
    <div
      className="border rounded-md bg-background"
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <EditorContent editor={editor} />

      {/* Image previews */}
      {uploadedImages.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          {uploadedImages.map((image, index) => (
            <div key={image.storageId} className="relative">
              <img
                src={image.previewUrl}
                alt={image.fileName}
                className="h-16 w-16 object-cover rounded"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-1 -right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground hover:bg-destructive/90"
                aria-label={`Remove ${image.fileName}`}
              >
                <IconX className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between border-t px-2 py-1">
        <div className="flex items-center gap-0.5">
          <Toggle
            size="sm"
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Toggle bold"
          >
            <IconBold className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Toggle italic"
          >
            <IconItalic className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("bulletList")}
            onPressedChange={() =>
              editor.chain().focus().toggleBulletList().run()
            }
            aria-label="Toggle bullet list"
          >
            <IconList className="h-4 w-4" />
          </Toggle>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImageUpload(file);
                e.target.value = "";
              }
            }}
          />
          <Toggle
            size="sm"
            pressed={false}
            onPressedChange={() => fileInputRef.current?.click()}
            aria-label="Upload image"
            disabled={isUploading}
          >
            {isUploading ? (
              <IconLoader2 className="h-4 w-4 animate-spin" />
            ) : (
              <IconPhoto className="h-4 w-4" />
            )}
          </Toggle>
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || (!hasContent && uploadedImages.length === 0)}
        >
          {isSubmitting ? (
            <IconLoader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <IconSend className="h-4 w-4 mr-1" />
              Send
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
