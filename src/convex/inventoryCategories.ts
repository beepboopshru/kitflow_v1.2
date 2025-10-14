import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    categoryType: v.optional(
      v.union(v.literal("raw_material"), v.literal("pre_processed")),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.categoryType) {
      return await ctx.db
        .query("inventoryCategories")
        .withIndex("by_categoryType", (q) =>
          q.eq("categoryType", args.categoryType as "raw_material" | "pre_processed"),
        )
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
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Uniqueness check via index
    const existing = await ctx.db
      .query("inventoryCategories")
      .withIndex("by_value", (q) => q.eq("value", args.value))
      .unique();

    if (existing) {
      throw new Error("Category value already exists");
    }

    const categoryId = await ctx.db.insert("inventoryCategories", {
      name: args.name,
      value: args.value,
      categoryType: args.categoryType,
      createdBy: userId,
    });

    return categoryId;
  },
});

export const remove = mutation({
  args: {
    id: v.id("inventoryCategories"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.db.delete(args.id);
  },
});