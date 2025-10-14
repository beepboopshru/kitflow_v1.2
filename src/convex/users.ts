import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
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
export const getCurrentUser = async (ctx: QueryCtx | MutationCtx) => {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    return null;
  }
  return await ctx.db.get(userId);
};

export const createUserAccount = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    role: v.optional(roleValidator),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) throw new Error("Unauthorized");

    // Check if current user is admin
    if (currentUser.role !== "admin") {
      throw new Error("Only admins can create user accounts");
    }

    // Check if username already exists using the indexed query
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.username))
      .first();

    if (existingUser) {
      throw new Error("Username already exists");
    }

    // NOTE: This only creates a user profile; it does NOT register credentials
    // with the Password provider. The new user must complete sign-up to set a password.
    const userId = await ctx.db.insert("users", {
      email: args.username,
      name: args.username,
      role: args.role || "user",
      isAnonymous: false,
    });

    return { userId, username: args.username };
  },
});