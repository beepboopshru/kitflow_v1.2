import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: { 
    kitId: v.optional(v.id("kits"))
  },
  handler: async (ctx, args) => {
    // Avoid TS narrowing issue by assigning to a local const
    if (args.kitId !== undefined) {
      const k = args.kitId as Id<"kits">;
      return await ctx.db
        .query("laserFiles")
        .withIndex("by_kit", (q) => q.eq("kitId", k))
        .collect();
    }

    return await ctx.db.query("laserFiles").collect();
  },
});

export const getByKit = query({
  args: {
    kitId: v.id("kits")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("laserFiles")
      .withIndex("by_kit", (q) => q.eq("kitId", args.kitId))
      .collect();
  },
});

export const create = mutation({
  args: {
    kitId: v.id("kits"),
    fileName: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    return await ctx.db.insert("laserFiles", {
      kitId: args.kitId,
      fileName: args.fileName,
      storageId: args.storageId,
      uploadedBy: user._id,
      uploadedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("laserFiles") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const file = await ctx.db.get(args.id);
    if (!file) throw new Error("File not found");

    // Delete from storage with correct Id typing
    await ctx.storage.delete(file.storageId as Id<"_storage">);

    // Delete from database
    return await ctx.db.delete(args.id);
  },
});