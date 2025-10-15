import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Get all users with their roles
 * Only accessible by admins
 */
export const listUsersWithRoles = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Unauthorized");
    if (currentUser.role !== "admin") throw new Error("Admin access required");

    return await ctx.db.query("users").collect();
  },
});

/**
 * Update a user's role
 * Only accessible by admins
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Unauthorized");
    if (currentUser.role !== "admin") throw new Error("Admin access required");

    // Prevent users from removing their own admin role
    if (currentUser._id === args.userId && args.role !== "admin") {
      throw new Error("Cannot remove your own admin role");
    }

    await ctx.db.patch(args.userId, { role: args.role });
    return { success: true };
  },
});

/**
 * Delete a user
 * Only accessible by admins
 */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Unauthorized");
    if (currentUser.role !== "admin") throw new Error("Admin access required");

    // Prevent admins from deleting themselves
    if (currentUser._id === args.userId) {
      throw new Error("Cannot delete your own account");
    }

    await ctx.db.delete(args.userId);
    return { success: true };
  },
});

/**
 * Check if current user has a specific role
 */
export const hasRole = query({
  args: {
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) return false;
    return currentUser.role === args.role;
  },
});

/**
 * Get current user's role
 */
export const getCurrentUserRole = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) return null;
    return currentUser.role ?? null;
  },
});

/**
 * Get pending users (unapproved)
 * Only accessible by admins
 */
export const listPendingUsers = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Unauthorized");
    if (currentUser.role !== "admin") throw new Error("Admin access required");

    return await ctx.db
      .query("users")
      .withIndex("by_approval_status", (q) => q.eq("isApproved", false))
      .collect();
  },
});

/**
 * Approve a user and set their role
 * Only accessible by admins
 */
export const approveUser = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Unauthorized");
    if (currentUser.role !== "admin") throw new Error("Admin access required");

    await ctx.db.patch(args.userId, {
      isApproved: true,
      role: args.role,
      approvedBy: currentUser._id,
      approvedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Check if current user is approved
 */
export const isUserApproved = query({
  args: {},
  handler: async (ctx) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) return false;
    // Admins are always approved
    if (currentUser.role === "admin") return true;
    return currentUser.isApproved === true;
  },
});