import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserOrgId } from "./lib/auth";
import { ConvexError } from "convex/values";

/**
 * List all non-archived clients for the current user's organization.
 * Results are sorted alphabetically by name.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getUserOrgId(ctx);

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isArchived"), false))
      .collect();

    // Sort alphabetically by name (case-insensitive)
    return clients.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  },
});

/**
 * Get a single client by ID.
 * Returns null if not found or not authorized.
 */
export const getById = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const client = await ctx.db.get(args.id);

    // Return null if not found or not in user's org (don't reveal if ID exists)
    if (!client || client.orgId !== orgId) {
      return null;
    }

    return client;
  },
});

/**
 * Create a new client.
 * Name is required (1-200 chars), email and defaultHourlyRate are optional.
 */
export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    defaultHourlyRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);

    // Validate name length
    const trimmedName = args.name.trim();
    if (trimmedName.length === 0) {
      throw new ConvexError("Name is required");
    }
    if (trimmedName.length > 200) {
      throw new ConvexError("Name must be 200 characters or less");
    }

    // Validate hourly rate is non-negative
    if (args.defaultHourlyRate !== undefined && args.defaultHourlyRate < 0) {
      throw new ConvexError("Hourly rate cannot be negative");
    }

    // Validate email format if provided
    if (args.email && args.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(args.email.trim())) {
        throw new ConvexError("Invalid email format");
      }
    }

    const clientId = await ctx.db.insert("clients", {
      orgId,
      name: trimmedName,
      email: args.email?.trim() || undefined,
      defaultHourlyRate: args.defaultHourlyRate,
      isArchived: false,
      createdAt: Date.now(),
    });

    return clientId;
  },
});

/**
 * Update an existing client.
 * Only provided fields are updated.
 */
export const update = mutation({
  args: {
    id: v.id("clients"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    defaultHourlyRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const client = await ctx.db.get(args.id);

    // Don't reveal if client exists in another org
    if (!client || client.orgId !== orgId) {
      throw new ConvexError("Client not found");
    }

    // Build update object with only provided fields
    const updates: {
      name?: string;
      email?: string;
      defaultHourlyRate?: number;
    } = {};

    if (args.name !== undefined) {
      const trimmedName = args.name.trim();
      if (trimmedName.length === 0) {
        throw new ConvexError("Name is required");
      }
      if (trimmedName.length > 200) {
        throw new ConvexError("Name must be 200 characters or less");
      }
      updates.name = trimmedName;
    }

    if (args.email !== undefined) {
      if (args.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(args.email.trim())) {
          throw new ConvexError("Invalid email format");
        }
        updates.email = args.email.trim();
      } else {
        updates.email = undefined;
      }
    }

    if (args.defaultHourlyRate !== undefined) {
      if (args.defaultHourlyRate < 0) {
        throw new ConvexError("Hourly rate cannot be negative");
      }
      updates.defaultHourlyRate = args.defaultHourlyRate;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.id, updates);
    }
  },
});

/**
 * Archive a client (soft delete).
 * Archived clients won't appear in the list and can't be selected for new tasks.
 */
export const archive = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const client = await ctx.db.get(args.id);

    // Don't reveal if client exists in another org
    if (!client || client.orgId !== orgId) {
      throw new ConvexError("Client not found");
    }

    if (client.isArchived) {
      throw new ConvexError("Client is already archived");
    }

    await ctx.db.patch(args.id, { isArchived: true });
  },
});

/**
 * F4.1: Unarchive a client (restore from archived state).
 */
export const unarchive = mutation({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const orgId = await getUserOrgId(ctx);
    const client = await ctx.db.get(args.id);

    if (!client || client.orgId !== orgId) {
      throw new ConvexError("Client not found");
    }

    if (!client.isArchived) {
      throw new ConvexError("Client is not archived");
    }

    await ctx.db.patch(args.id, { isArchived: false });
  },
});

/**
 * F4.1: List archived clients for the current user's organization.
 */
export const listArchived = query({
  args: {},
  handler: async (ctx) => {
    const orgId = await getUserOrgId(ctx);

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("isArchived"), true))
      .collect();

    return clients.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );
  },
});
