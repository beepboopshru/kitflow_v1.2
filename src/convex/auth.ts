import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Anonymous],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // Check if this is an anonymous user
      if (args.existingUserId === undefined && args.profile?.isAnonymous) {
        // Automatically assign admin role to anonymous users for bootstrapping
        return {
          role: "admin" as const,
        };
      }
      return {};
    },
  },
});