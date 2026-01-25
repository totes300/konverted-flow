import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUser } from "./lib/auth";

/**
 * Get the current authenticated user
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await getUser(ctx);
  },
});

/**
 * Get all users in the current organization
 */
export const listByOrg = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("users")
      .withIndex("by_orgId", (q) => q.eq("orgId", user.orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});

/**
 * Mutation to upsert a user from Clerk webhook.
 * Creates or updates a user based on Clerk ID.
 * F1.2: Uses deterministic admin selection to prevent race conditions.
 *
 * Security note: This mutation is called from the Clerk webhook route which
 * validates requests using Svix cryptographic signatures. The webhook secret
 * ensures only Clerk can trigger user creation/updates.
 */
export const upsertFromClerk = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser) {
      // Update existing user (skip if deleted)
      if (!existingUser.isDeleted) {
        await ctx.db.patch(existingUser._id, {
          email: args.email,
          name: args.name,
          avatarUrl: args.avatarUrl,
          lastSeenAt: Date.now(),
        });
      }
      return existingUser._id;
    }

    // Check if there are any existing organizations
    const existingOrgs = await ctx.db.query("organizations").first();
    let orgId;

    if (!existingOrgs) {
      // Create default organization for first user
      orgId = await ctx.db.insert("organizations", {
        name: "My Organization",
        timezone: "Europe/Budapest",
        createdAt: Date.now(),
      });
    } else {
      // Use existing org (in production, you'd want proper org assignment)
      orgId = existingOrgs._id;
    }

    // F1.2: Deterministic admin selection to prevent race condition
    // Get all existing users in org
    const existingUsersInOrg = await ctx.db
      .query("users")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    // Check if any existing user is admin
    const hasAdmin = existingUsersInOrg.some((u) => u.role === "admin");

    // If no admin exists, this user becomes admin only if they have the
    // lowest clerkId (deterministic tie-breaker for concurrent signups)
    let role: "admin" | "member" = "member";
    if (!hasAdmin) {
      const allClerkIds = [...existingUsersInOrg.map((u) => u.clerkId), args.clerkId];
      allClerkIds.sort();
      if (allClerkIds[0] === args.clerkId) {
        role = "admin";
      }
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      orgId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      role,
      lastSeenAt: Date.now(),
      isDeleted: false,
    });

    return userId;
  },
});

/**
 * Mutation to soft delete a user (when deleted from Clerk).
 * F1.3: Properly sets isDeleted flag and stops running timers.
 *
 * Security note: This mutation is called from the Clerk webhook route which
 * validates requests using Svix cryptographic signatures.
 */
export const deleteFromClerk = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existingUser && !existingUser.isDeleted) {
      // F1.3: Stop any running timers before deleting
      const runningEntry = await ctx.db
        .query("timeEntries")
        .withIndex("by_userId_and_isRunning", (q) =>
          q.eq("userId", existingUser._id).eq("isRunning", true)
        )
        .first();

      if (runningEntry) {
        // Only calculate duration if startTime exists (skip if undefined to avoid data loss)
        if (runningEntry.startTime) {
          const duration = Math.floor(
            (Date.now() - runningEntry.startTime) / 1000
          );
          await ctx.db.patch(runningEntry._id, {
            isRunning: false,
            durationSeconds: duration,
          });

          // Update task total time
          const task = await ctx.db.get(runningEntry.taskId);
          if (task) {
            await ctx.db.patch(runningEntry.taskId, {
              totalTimeSeconds: task.totalTimeSeconds + duration,
              updatedAt: Date.now(),
            });
          }
        } else {
          // No startTime - just stop the timer without updating duration
          await ctx.db.patch(runningEntry._id, {
            isRunning: false,
          });
        }
      }

      // F1.3: Proper soft delete - set isDeleted flag
      await ctx.db.patch(existingUser._id, {
        isDeleted: true,
        activeTimeEntryId: undefined,
        lastSeenAt: Date.now(),
      });
    }
  },
});

/**
 * Update current user's last seen timestamp
 */
export const updateLastSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (user) {
      await ctx.db.patch(user._id, {
        lastSeenAt: Date.now(),
      });
    }
  },
});

/**
 * Ensure the current authenticated user exists in the database.
 * Auto-creates the user if they're authenticated via Clerk but don't have a record.
 * This should be called when the app loads to handle users who signed up before webhooks were configured.
 */
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existingUser) {
      // If deleted, don't allow access
      if (existingUser.isDeleted) {
        return null;
      }
      // Update last seen
      await ctx.db.patch(existingUser._id, {
        lastSeenAt: Date.now(),
      });
      return existingUser._id;
    }

    // User doesn't exist - create them
    // Check if there are any existing organizations
    const existingOrgs = await ctx.db.query("organizations").first();
    let orgId;

    if (!existingOrgs) {
      // Create default organization for first user
      orgId = await ctx.db.insert("organizations", {
        name: "My Organization",
        timezone: "Europe/Budapest",
        createdAt: Date.now(),
      });
    } else {
      // Use existing org
      orgId = existingOrgs._id;
    }

    // F1.2: Deterministic admin selection
    const existingUsersInOrg = await ctx.db
      .query("users")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const hasAdmin = existingUsersInOrg.some((u) => u.role === "admin");
    let role: "admin" | "member" = "member";
    if (!hasAdmin) {
      const allClerkIds = [...existingUsersInOrg.map((u) => u.clerkId), identity.subject];
      allClerkIds.sort();
      if (allClerkIds[0] === identity.subject) {
        role = "admin";
      }
    }

    // Extract user info from Clerk identity
    const email = identity.email ?? "";
    const name = identity.name ?? identity.nickname ?? "User";
    const avatarUrl = identity.pictureUrl;

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      orgId,
      email,
      name,
      avatarUrl,
      role,
      lastSeenAt: Date.now(),
      isDeleted: false,
    });

    return userId;
  },
});
