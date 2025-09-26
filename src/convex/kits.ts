import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(v.literal("cstem"), v.literal("robotics")),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    stockCount: v.number(),
    lowStockThreshold: v.number(),
    packingRequirements: v.optional(v.string()),
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
    type: v.optional(v.union(v.literal("cstem"), v.literal("robotics"))),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    stockCount: v.optional(v.number()),
    lowStockThreshold: v.optional(v.number()),
    packingRequirements: v.optional(v.string()),
    status: v.optional(v.union(v.literal("in_stock"), v.literal("assigned"))),
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
