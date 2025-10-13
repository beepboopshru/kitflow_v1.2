import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { roleValidator } from "./schema";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (user === null) {
      return null;
    }

    return user;
  },
});

/**
 * Use this function internally to get the current user data. Remember to handle the null user case.
 * @param ctx
 * @returns
 */
export const getCurrentUser = async (ctx: QueryCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

export const setUserRole = mutation({
  args: {
    email: v.string(),
    role: roleValidator,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");
    
    // Find user by email
    const targetUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .unique();
    
    if (!targetUser) {
      throw new Error(`User with email ${args.email} not found`);
    }
    
    // Update user role
    await ctx.db.patch(targetUser._id, {
      role: args.role,
    });
    
    return { success: true, userId: targetUser._id, newRole: args.role };
  },
});

export const upgradeAnonymousUsersToAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all anonymous users without admin role
    const allUsers = await ctx.db.query("users").collect();
    const anonymousUsers = allUsers.filter(
      (user) => user.isAnonymous === true && user.role !== "admin"
    );
    
    let updatedCount = 0;
    for (const user of anonymousUsers) {
      await ctx.db.patch(user._id, {
        role: "admin" as const,
      });
      updatedCount++;
    }
    
    return { success: true, updatedCount };
  },
});