import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("programs").collect();
  },
});

export const get = query({
  args: { id: v.id("programs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Validate slug format (lowercase, alphanumeric + hyphens)
    if (!/^[a-z0-9-]+$/.test(args.slug)) {
      throw new Error("Invalid slug format");
    }

    // Check if slug already exists
    const existing = await ctx.db
      .query("programs")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();

    if (existing) {
      throw new Error("A program with this name already exists");
    }

    return await ctx.db.insert("programs", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      categories: args.categories,
      createdBy: user._id,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("programs"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categories: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const { id, ...updates } = args;
    return await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("programs") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Check if any kits use this program
    const program = await ctx.db.get(args.id);
    if (!program) throw new Error("Program not found");

    const kitsUsingProgram = await ctx.db
      .query("kits")
      .filter((q) => q.eq(q.field("type"), program.slug))
      .first();

    if (kitsUsingProgram) {
      throw new Error("Cannot delete program that has associated kits");
    }

    return await ctx.db.delete(args.id);
  },
});
