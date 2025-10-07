import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: {
    name: v.string(),
    type: v.string(),
    category: v.optional(v.string()),
    cstemVariant: v.optional(v.union(v.literal("explorer"), v.literal("discoverer"))),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    stockCount: v.number(),
    lowStockThreshold: v.number(),
    packingRequirements: v.optional(v.string()),
    isStructured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    return await ctx.db.insert("kits", {
      ...args,
      status: "in_stock" as const,
      createdBy: user._id,
    });
  },
});

export const copy = mutation({
  args: {
    kitId: v.id("kits"),
    newType: v.string(),
    newName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const originalKit = await ctx.db.get(args.kitId);
    if (!originalKit) throw new Error("Kit not found");

    // Create a copy with the new program type
    const newKit = {
      name: args.newName || `${originalKit.name} (Copy)`,
      type: args.newType,
      cstemVariant: args.newType === "cstem" ? originalKit.cstemVariant : undefined,
      description: originalKit.description,
      image: originalKit.image,
      stockCount: 0, // Start with 0 stock for the copy
      lowStockThreshold: originalKit.lowStockThreshold,
      packingRequirements: originalKit.packingRequirements,
      isStructured: originalKit.isStructured,
      status: "in_stock" as const,
      createdBy: user._id,
    };

    return await ctx.db.insert("kits", newKit);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("kits").collect();
  },
});

export const get = query({
  args: { id: v.id("kits") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("kits"),
    name: v.optional(v.string()),
    type: v.optional(v.string()),
    category: v.optional(v.string()),
    cstemVariant: v.optional(v.union(v.literal("explorer"), v.literal("discoverer"))),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    stockCount: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    packingRequirements: v.optional(v.string()),
    isStructured: v.optional(v.boolean()),
    status: v.optional(v.union(v.literal("in_stock"), v.literal("assigned"))),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("kits") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    return await ctx.db.delete(args.id);
  },
});

export const getLowStockKits = query({
  args: {},
  handler: async (ctx) => {
    const kits = await ctx.db.query("kits").collect();
    return kits.filter(kit => kit.stockCount <= kit.lowStockThreshold);
  },
});