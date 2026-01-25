"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IconDotsVertical, IconTrash, IconLoader2 } from "@tabler/icons-react";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { formatCommentTimestamp } from "@/lib/format";
import { sanitizeHtml } from "@/lib/sanitize";

interface Attachment {
  storageId: Id<"_storage">;
  url: string | null;
}

interface CommentCardProps {
  eventId: Id<"activityEvents">;
  content: string;
  user: {
    _id: string;
    name: string;
    avatarUrl?: string;
  } | null;
  createdAt: number;
  currentUserId?: string;
  currentUserRole?: string;
  attachments?: Attachment[];
  onImageClick?: (url: string, fileName: string) => void;
}

export function CommentCard({
  eventId,
  content,
  user,
  createdAt,
  currentUserId,
  currentUserRole,
  attachments = [],
  onImageClick,
}: CommentCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteComment = useMutation(api.activities.deleteComment);

  const userName = user?.name ?? "Unknown user";
  const timestamp = formatCommentTimestamp(createdAt);

  // Sanitize HTML content to prevent XSS
  const sanitizedContent = useMemo(() => sanitizeHtml(content), [content]);

  // Check if current user can edit/delete
  const canModify = user?._id === currentUserId || currentUserRole === "admin";

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteComment({ eventId });
      setShowDeleteDialog(false);
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Failed to delete comment:", error);
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
    }
  };

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div className="rounded-lg border bg-card p-3 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              {user?.avatarUrl && (
                <AvatarImage src={user.avatarUrl} alt={userName} />
              )}
              <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{userName}</span>
              <span className="text-xs text-muted-foreground">{timestamp}</span>
            </div>
          </div>

          {canModify && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <IconDotsVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <IconTrash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content - sanitized HTML */}
        <div
          className="mt-2 text-sm prose prose-sm dark:prose-invert max-w-none [&_.mention]:bg-primary/10 [&_.mention]:text-primary [&_.mention]:rounded [&_.mention]:px-1 [&_.mention]:font-medium"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {attachments.map(
              (attachment, index) =>
                attachment.url && (
                  <button
                    key={attachment.storageId}
                    onClick={() =>
                      onImageClick?.(attachment.url!, `Image ${index + 1}`)
                    }
                    className="relative overflow-hidden rounded-md border hover:opacity-90 transition-opacity"
                  >
                    <img
                      src={attachment.url}
                      alt={`Attachment ${index + 1}`}
                      className="h-20 w-auto max-w-[150px] object-cover"
                    />
                  </button>
                )
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The comment will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
