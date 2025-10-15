import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getFileUrl = action({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    // Cast to Id<"_storage"> since storageId is stored as string in our tables
    const url = await ctx.storage.getUrl(args.storageId as Id<"_storage">);
    return url; // string | null
  },
});