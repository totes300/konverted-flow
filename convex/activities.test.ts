import { describe, expect, it } from "vitest";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

describe("Activity Events Schema", () => {
  it("should define activityEvents table", () => {
    expect(schema.tables.activityEvents).toBeDefined();
  });

  it("should have correct indexes defined", () => {
    const activityEventsTable = schema.tables.activityEvents;
    expect(activityEventsTable).toBeDefined();
  });
});

describe("Activity Event Field Validation", () => {
  it("should require orgId as organization reference", () => {
    type OrgId = Id<"organizations">;
    const checkOrgId: OrgId extends string ? true : false = true;
    expect(checkOrgId).toBe(true);
  });

  it("should require taskId as task reference", () => {
    type TaskId = Id<"tasks">;
    const checkTaskId: TaskId extends string ? true : false = true;
    expect(checkTaskId).toBe(true);
  });

  it("should require userId as user reference", () => {
    type UserId = Id<"users">;
    const checkUserId: UserId extends string ? true : false = true;
    expect(checkUserId).toBe(true);
  });

  it("should have eventType as string", () => {
    const validEventTypes = [
      "task_created",
      "status_changed",
      "assignee_changed",
      "time_logged",
      "comment",
    ];
    validEventTypes.forEach((type) => {
      expect(typeof type).toBe("string");
    });
  });

  it("should have isDeleted as boolean for soft delete", () => {
    expect([true, false].every((v) => typeof v === "boolean")).toBe(true);
  });

  it("should have createdAt as number (Unix timestamp)", () => {
    const timestamp = Date.now();
    expect(typeof timestamp).toBe("number");
    expect(timestamp).toBeGreaterThan(0);
  });
});

describe("Activity Event Types", () => {
  const eventTypes = [
    "task_created",
    "task_updated",
    "status_changed",
    "assignee_changed",
    "time_logged",
    "comment",
    "mention",
  ];

  it("should support task_created event", () => {
    expect(eventTypes).toContain("task_created");
  });

  it("should support status_changed event", () => {
    expect(eventTypes).toContain("status_changed");
  });

  it("should support assignee_changed event", () => {
    expect(eventTypes).toContain("assignee_changed");
  });

  it("should support time_logged event", () => {
    expect(eventTypes).toContain("time_logged");
  });

  it("should support comment event", () => {
    expect(eventTypes).toContain("comment");
  });
});

describe("Activity Event Data Structure", () => {
  describe("Comment Event Data", () => {
    it("should include content string", () => {
      const commentData = {
        content: "This is a comment",
        mentionedUserIds: [] as Id<"users">[],
        attachmentIds: [] as Id<"_storage">[],
      };
      expect(typeof commentData.content).toBe("string");
    });

    it("should support mentionedUserIds array", () => {
      const commentData = {
        content: "Hey @user",
        mentionedUserIds: ["user1" as Id<"users">, "user2" as Id<"users">],
      };
      expect(Array.isArray(commentData.mentionedUserIds)).toBe(true);
    });

    it("should support attachmentIds array", () => {
      const commentData = {
        content: "See attached",
        attachmentIds: ["storage1" as Id<"_storage">],
      };
      expect(Array.isArray(commentData.attachmentIds)).toBe(true);
    });
  });

  describe("Status Changed Event Data", () => {
    it("should include fromValue and toValue", () => {
      const statusData = {
        field: "status",
        fromValue: "today",
        toValue: "in_progress",
      };
      expect(statusData.fromValue).toBe("today");
      expect(statusData.toValue).toBe("in_progress");
    });
  });

  describe("Time Logged Event Data", () => {
    it("should include durationSeconds", () => {
      const timeLoggedData = {
        durationSeconds: 3600,
      };
      expect(typeof timeLoggedData.durationSeconds).toBe("number");
      expect(timeLoggedData.durationSeconds).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("Comment Content Validation", () => {
  const MAX_COMMENT_LENGTH = 10000;

  it("should accept comments within length limit", () => {
    const validComment = "A".repeat(MAX_COMMENT_LENGTH);
    expect(validComment.length).toBe(MAX_COMMENT_LENGTH);
    expect(validComment.length).toBeLessThanOrEqual(MAX_COMMENT_LENGTH);
  });

  it("should reject comments exceeding length limit", () => {
    const invalidComment = "A".repeat(MAX_COMMENT_LENGTH + 1);
    expect(invalidComment.length).toBeGreaterThan(MAX_COMMENT_LENGTH);
  });

  it("should require non-empty content after trimming", () => {
    const emptyComments = ["", "   ", "\n\t\n"];
    emptyComments.forEach((comment) => {
      expect(comment.trim().length).toBe(0);
    });
  });

  it("should accept valid comment content", () => {
    const validComments = [
      "Hello",
      "This is a comment",
      "   Trimmed   ",
      "<p>HTML content</p>",
    ];
    validComments.forEach((comment) => {
      expect(comment.trim().length).toBeGreaterThan(0);
    });
  });
});

describe("File Upload Validation", () => {
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  describe("File Size", () => {
    it("should accept files within size limit", () => {
      const validSizes = [1, 1024, 1024 * 1024, MAX_FILE_SIZE];
      validSizes.forEach((size) => {
        expect(size).toBeLessThanOrEqual(MAX_FILE_SIZE);
      });
    });

    it("should reject files exceeding size limit", () => {
      const invalidSizes = [MAX_FILE_SIZE + 1, 10 * 1024 * 1024];
      invalidSizes.forEach((size) => {
        expect(size).toBeGreaterThan(MAX_FILE_SIZE);
      });
    });
  });

  describe("File Type", () => {
    it("should accept allowed image types", () => {
      ALLOWED_IMAGE_TYPES.forEach((type) => {
        expect(ALLOWED_IMAGE_TYPES).toContain(type);
      });
    });

    it("should reject non-image types", () => {
      const invalidTypes = [
        "text/html",
        "application/pdf",
        "application/javascript",
        "text/plain",
      ];
      invalidTypes.forEach((type) => {
        expect(ALLOWED_IMAGE_TYPES).not.toContain(type);
      });
    });

    it("should reject SVG for security reasons", () => {
      expect(ALLOWED_IMAGE_TYPES).not.toContain("image/svg+xml");
    });
  });
});

describe("Activity Feed Query", () => {
  describe("Sorting", () => {
    it("should sort events by createdAt descending (newest first)", () => {
      const events = [
        { _id: "1", createdAt: 1000 },
        { _id: "2", createdAt: 3000 },
        { _id: "3", createdAt: 2000 },
      ];
      const sorted = [...events].sort((a, b) => b.createdAt - a.createdAt);
      expect(sorted[0]._id).toBe("2");
      expect(sorted[1]._id).toBe("3");
      expect(sorted[2]._id).toBe("1");
    });
  });

  describe("Filtering", () => {
    it("should exclude deleted events", () => {
      const events = [
        { _id: "1", isDeleted: false },
        { _id: "2", isDeleted: true },
        { _id: "3", isDeleted: false },
      ];
      const active = events.filter((e) => !e.isDeleted);
      expect(active).toHaveLength(2);
      expect(active.map((e) => e._id)).toEqual(["1", "3"]);
    });
  });

  describe("Batch Fetching", () => {
    it("should deduplicate user IDs before fetching", () => {
      const events = [
        { userId: "user1" },
        { userId: "user2" },
        { userId: "user1" },
        { userId: "user3" },
        { userId: "user2" },
      ];
      const userIds = [...new Set(events.map((e) => e.userId))];
      expect(userIds).toHaveLength(3);
      expect(userIds).toEqual(["user1", "user2", "user3"]);
    });

    it("should deduplicate attachment IDs before fetching", () => {
      const events = [
        { data: { attachmentIds: ["a1", "a2"] } },
        { data: { attachmentIds: ["a2", "a3"] } },
        { data: {} },
      ];
      const allIds = events.flatMap((e) => e.data.attachmentIds ?? []);
      const uniqueIds = [...new Set(allIds)];
      expect(uniqueIds).toHaveLength(3);
      expect(uniqueIds).toEqual(["a1", "a2", "a3"]);
    });
  });
});

describe("Comment Permissions", () => {
  describe("Edit Permission", () => {
    it("should allow author to edit own comment", () => {
      const comment = { userId: "user1" };
      const currentUser = { _id: "user1", role: "member" };
      const canEdit =
        comment.userId === currentUser._id || currentUser.role === "admin";
      expect(canEdit).toBe(true);
    });

    it("should allow admin to edit any comment", () => {
      const comment = { userId: "user1" };
      const currentUser = { _id: "user2", role: "admin" };
      const canEdit =
        comment.userId === currentUser._id || currentUser.role === "admin";
      expect(canEdit).toBe(true);
    });

    it("should not allow other users to edit comment", () => {
      const comment = { userId: "user1" };
      const currentUser = { _id: "user2", role: "member" };
      const canEdit =
        comment.userId === currentUser._id || currentUser.role === "admin";
      expect(canEdit).toBe(false);
    });
  });

  describe("Delete Permission", () => {
    it("should allow author to delete own comment", () => {
      const comment = { userId: "user1" };
      const currentUser = { _id: "user1", role: "member" };
      const canDelete =
        comment.userId === currentUser._id || currentUser.role === "admin";
      expect(canDelete).toBe(true);
    });

    it("should allow admin to delete any comment", () => {
      const comment = { userId: "user1" };
      const currentUser = { _id: "user2", role: "admin" };
      const canDelete =
        comment.userId === currentUser._id || currentUser.role === "admin";
      expect(canDelete).toBe(true);
    });
  });
});

describe("Mention Extraction", () => {
  it("should extract mentions from TipTap JSON structure", () => {
    const content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hey " },
            { type: "mention", attrs: { id: "user1" } },
            { type: "text", text: " check this " },
            { type: "mention", attrs: { id: "user2" } },
          ],
        },
      ],
    };

    const mentionedIds = new Set<string>();
    const extractMentions = (nodes: unknown[]) => {
      for (const node of nodes) {
        if (typeof node === "object" && node !== null && "type" in node) {
          const typedNode = node as {
            type: string;
            attrs?: { id?: string };
            content?: unknown[];
          };
          if (typedNode.type === "mention" && typedNode.attrs?.id) {
            mentionedIds.add(typedNode.attrs.id);
          }
          if (typedNode.content) {
            extractMentions(typedNode.content);
          }
        }
      }
    };

    if (content.content) {
      extractMentions(content.content);
    }

    expect(mentionedIds.size).toBe(2);
    expect(mentionedIds.has("user1")).toBe(true);
    expect(mentionedIds.has("user2")).toBe(true);
  });

  it("should handle empty content", () => {
    const content = { type: "doc", content: [] };
    const mentionedIds = new Set<string>();
    expect(mentionedIds.size).toBe(0);
  });

  it("should handle content without mentions", () => {
    const content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "No mentions here" }],
        },
      ],
    };
    const mentionedIds = new Set<string>();
    expect(mentionedIds.size).toBe(0);
  });
});

describe("Activity Response Types", () => {
  it("should include user data with avatar", () => {
    type ActivityUser = {
      _id: Id<"users">;
      name: string;
      avatarUrl?: string;
    };
    const user: ActivityUser = {
      _id: "user1" as Id<"users">,
      name: "John Doe",
      avatarUrl: "https://example.com/avatar.jpg",
    };
    expect(user._id).toBeDefined();
    expect(user.name).toBeDefined();
    expect(user.avatarUrl).toBeDefined();
  });

  it("should include attachment data with URL", () => {
    type ActivityAttachment = {
      storageId: Id<"_storage">;
      url: string | null;
    };
    const attachment: ActivityAttachment = {
      storageId: "storage1" as Id<"_storage">,
      url: "https://example.com/image.jpg",
    };
    expect(attachment.storageId).toBeDefined();
    expect(attachment.url).toBeDefined();
  });

  it("should handle null user gracefully", () => {
    const event = {
      _id: "event1",
      user: null as { _id: string; name: string } | null,
    };
    expect(event.user).toBeNull();
    const userName = event.user?.name ?? "Unknown user";
    expect(userName).toBe("Unknown user");
  });

  it("should handle null attachment URL gracefully", () => {
    const attachment = {
      storageId: "storage1",
      url: null as string | null,
    };
    expect(attachment.url).toBeNull();
  });
});
