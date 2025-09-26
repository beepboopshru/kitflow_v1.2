import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const listByCategory = query({
  args: { category: v.union(v.literal("raw_material"), v.literal("pre_processed"), v.literal("finished_good")) },
  handler: async (ctx, args) => {
    return await ctx.db.query("inventory").withIndex("by_category", (q) => q.eq("category", args.category)).collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.union(v.literal("raw_material"), v.literal("pre_processed"), v.literal("finished_good")),
    unit: v.optional(v.string()),
    quantity: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    return await ctx.db.insert("inventory", {
      name: args.name,
      category: args.category,
      unit: args.unit,
      quantity: args.quantity,
      notes: args.notes,
      createdBy: user._id,
    });
  },
});

export const adjustStock = mutation({
  args: {
    id: v.id("inventory"),
    delta: v.number(), // positive to add, negative to remove
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const item = await ctx.db.get(args.id);
    if (!item) throw new Error("Item not found");

    const newQty = item.quantity + args.delta;
    if (newQty < 0) throw new Error("Resulting quantity cannot be negative");

    await ctx.db.patch(args.id, { quantity: newQty });
    return { quantity: newQty };
  },
});

export const update = mutation({
  args: {
    id: v.id("inventory"),
    name: v.optional(v.string()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("inventory") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
    return args.id;
  },
});
