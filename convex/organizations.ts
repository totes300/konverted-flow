import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUser } from "./lib/auth";

/**
 * F3.1: Get organization by ID.
 * Only returns org if user belongs to it.
 */
export const getById = query({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    const user = await getUser(ctx);
    if (!user || user.orgId !== args.id) {
      return null;
    }
    return await ctx.db.get(args.id);
  },
});

/**
 * F3.1: Get the current user's organization.
 */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUser(ctx);
    if (!user) return null;
    return await ctx.db.get(user.orgId);
  },
});
