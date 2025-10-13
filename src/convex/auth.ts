// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, Anonymous],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // If the user is signing in anonymously, set them as admin
      if (args.type === "credentials" && args.provider?.id === "anonymous") {
        return {
          role: "admin",
        };
      }
      // For existing users or non-anonymous users, don't modify the role
      return {};
    },
  },
});