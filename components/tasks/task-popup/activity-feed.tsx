"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { IconMessage } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentEditor } from "./comment-editor";
import { CommentCard } from "./comment-card";
import { ActivityEvent } from "./activity-event";
import { ImageLightbox } from "./image-lightbox";

interface ActivityFeedProps {
  taskId: Id<"tasks">;
}

export function ActivityFeed({ taskId }: ActivityFeedProps): React.ReactElement {
  const { user: clerkUser } = useUser();
  const activities = useQuery(api.activities.getByTaskId, { taskId });
  const users = useQuery(api.users.listByOrg);

  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    fileName: string;
  } | null>(null);

  // Find current user in the org users list
  const currentUser = users?.find((u) => u.clerkId === clerkUser?.id);

  if (activities === undefined) {
    return <ActivityFeedSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Activity list - scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {activities.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => {
              if (activity.eventType === "comment") {
                return (
                  <CommentCard
                    key={activity._id}
                    eventId={activity._id}
                    content={activity.data.content ?? ""}
                    user={activity.user}
                    createdAt={activity.createdAt}
                    currentUserId={currentUser?._id}
                    currentUserRole={currentUser?.role}
                    attachments={activity.attachments}
                    onImageClick={(url, fileName) =>
                      setLightboxImage({ url, fileName })
                    }
                  />
                );
              }

              // System events (status_changed, assignee_changed, time_logged, task_created)
              return (
                <ActivityEvent
                  key={activity._id}
                  eventType={
                    activity.eventType as
                      | "task_created"
                      | "status_changed"
                      | "assignee_changed"
                      | "time_logged"
                  }
                  data={activity.data}
                  user={activity.user}
                  createdAt={activity.createdAt}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Comment editor - fixed at bottom */}
      <div className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CommentEditor taskId={taskId} />
      </div>

      {/* Image lightbox */}
      {lightboxImage && (
        <ImageLightbox
          url={lightboxImage.url}
          fileName={lightboxImage.fileName}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}

function EmptyState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <IconMessage className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">No activity yet</p>
      <p className="mt-1 text-xs text-muted-foreground/70">
        Comments and updates will appear here as they happen.
      </p>
    </div>
  );
}

function ActivityFeedSkeleton(): React.ReactElement {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 space-y-4">
        {/* Comment skeleton */}
        <div className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Event skeleton */}
        <div className="flex gap-3 py-2">
          <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Event skeleton */}
        <div className="flex gap-3 py-2">
          <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Editor skeleton */}
      <div className="border-t p-4">
        <Skeleton className="h-24 w-full rounded-md" />
      </div>
    </div>
  );
}
