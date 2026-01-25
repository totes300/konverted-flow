"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { IconPhoto, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TaskThumbnailProps {
  taskId: Id<"tasks">;
  imageStorageId?: Id<"_storage">;
}

export function TaskThumbnail({ taskId, imageStorageId }: TaskThumbnailProps) {
  const [isUploading, setIsUploading] = useState(false);
  const imageUrl = useQuery(api.tasks.getTaskImageUrl, {
    storageId: imageStorageId,
  });
  const generateUploadUrl = useMutation(api.tasks.generateImageUploadUrl);
  const updateTaskImage = useMutation(api.tasks.updateTaskImage);
  const removeTaskImage = useMutation(api.tasks.removeTaskImage);

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          try {
            setIsUploading(true);
            const uploadUrl = await generateUploadUrl();

            const response = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": file.type },
              body: file,
            });

            const { storageId } = await response.json();
            // F1.5: Pass file type and size for validation
            await updateTaskImage({
              id: taskId,
              storageId,
              fileType: file.type,
              fileSize: file.size,
            });
            toast.success("Image uploaded");
          } catch (error) {
            // F1.5: Show validation error message if available
            const message =
              error instanceof Error ? error.message : "Failed to upload image";
            toast.error(message);
          } finally {
            setIsUploading(false);
          }
          break;
        }
      }
    },
    [taskId, generateUploadUrl, updateTaskImage]
  );

  const handleRemove = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await removeTaskImage({ id: taskId });
        toast.success("Image removed");
      } catch {
        toast.error("Failed to remove image");
      }
    },
    [taskId, removeTaskImage]
  );

  return (
    <div
      className={cn(
        "relative h-8 w-8 rounded border bg-muted/50 flex items-center justify-center overflow-hidden group/thumbnail",
        isUploading && "animate-pulse"
      )}
      onPaste={handlePaste}
      tabIndex={0}
    >
      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt="Task thumbnail"
            className="h-full w-full object-cover"
          />
          <button
            onClick={handleRemove}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumbnail:opacity-100 flex items-center justify-center transition-opacity"
          >
            <IconX className="h-4 w-4 text-white" />
          </button>
        </>
      ) : (
        <IconPhoto className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}
