import { QueryCtx, MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";

export type AuthContext = QueryCtx | MutationCtx;

/**
 * Get the current authenticated user or null if not authenticated.
 * Uses the Clerk identity to look up the user in our users table.
 * F1.3: Returns null if user is soft-deleted.
 */
export async function getUser(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
    .unique();

  // F1.3: Check if user is deleted
  if (user?.isDeleted) {
    return null;
  }

  return user;
}

/**
 * Require authentication. Throws ConvexError("Unauthorized") if not authenticated.
 * Returns the current user if authenticated.
 */
export async function requireAuth(ctx: AuthContext) {
  const user = await getUser(ctx);
  if (!user) {
    throw new ConvexError("Unauthorized");
  }
  return user;
}

/**
 * Require admin role. Throws ConvexError("Forbidden") if user is not an admin.
 * Returns the current user if they are an admin.
 */
export async function requireAdmin(ctx: AuthContext) {
  const user = await requireAuth(ctx);
  if (user.role !== "admin") {
    throw new ConvexError("Forbidden");
  }
  return user;
}

/**
 * Get the organization ID for the current user.
 * Throws ConvexError("Unauthorized") if not authenticated.
 */
export async function getUserOrgId(ctx: AuthContext): Promise<Id<"organizations">> {
  const user = await requireAuth(ctx);
  return user.orgId;
}

/**
 * Get user by Clerk ID (for webhook sync).
 * Returns null if user doesn't exist.
 */
export async function getUserByClerkId(ctx: AuthContext, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .unique();
}
