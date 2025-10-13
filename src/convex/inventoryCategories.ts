import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: {
    categoryType: v.optional(v.union(v.literal("raw_material"), v.literal("pre_processed"))),
  },
  handler: async (ctx, args) => {
    if (args.categoryType) {
      return await ctx.db
        .query("inventoryCategories")
        .withIndex("by_categoryType", (q) => q.eq("categoryType", args.categoryType))
        .collect();
    }
    return await ctx.db.query("inventoryCategories").collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    value: v.string(),
    categoryType: v.union(v.literal("raw_material"), v.literal("pre_processed")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Check if value already exists
    const existing = await ctx.db
      .query("inventoryCategories")
      .withIndex("by_value", (q) => q.eq("value", args.value))
      .first();

    if (existing) {
      throw new Error("A category with this value already exists");
    }

    return await ctx.db.insert("inventoryCategories", {
      name: args.name,
      value: args.value,
      categoryType: args.categoryType,
      createdBy: user._id,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("inventoryCategories") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    await ctx.db.delete(args.id);
    return args.id;
  },
});
