import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

export const list = query({
  args: { 
    kitId: v.optional(v.id("kits")),
    fileType: v.optional(v.union(
      v.literal("mdf_dxf"),
      v.literal("acrylic_dxf"),
      v.literal("printable_pdf")
    ))
  },
  handler: async (ctx, args) => {
    if (args.kitId && args.fileType) {
      const k = args.kitId as Id<"kits">;
      const t = args.fileType as "mdf_dxf" | "acrylic_dxf" | "printable_pdf";
      return await ctx.db
        .query("laserFiles")
        .withIndex("by_kit_and_type", (q) => 
          q.eq("kitId", k).eq("fileType", t)
        )
        .collect();
    } else if (args.kitId) {
      const k = args.kitId as Id<"kits">;
      return await ctx.db
        .query("laserFiles")
        .withIndex("by_kit", (q) => q.eq("kitId", k))
        .collect();
    }
    
    return await ctx.db.query("laserFiles").collect();
  },
});

export const getByKitAndType = query({
  args: {
    kitId: v.id("kits"),
    fileType: v.union(
      v.literal("mdf_dxf"),
      v.literal("acrylic_dxf"),
      v.literal("printable_pdf")
    )
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("laserFiles")
      .withIndex("by_kit_and_type", (q) => 
        q.eq("kitId", args.kitId).eq("fileType", args.fileType)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    kitId: v.id("kits"),
    fileType: v.union(
      v.literal("mdf_dxf"),
      v.literal("acrylic_dxf"),
      v.literal("printable_pdf")
    ),
    fileName: v.string(),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    return await ctx.db.insert("laserFiles", {
      kitId: args.kitId,
      fileType: args.fileType,
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