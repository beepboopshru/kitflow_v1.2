// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { internal } from "./_generated/api";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous,
    Password({
      id: "password",
      verify: async (params: { email: string; code: string }) => {
        // Verification is handled by Convex Auth automatically
        return true;
      },
      sendVerificationCode: async (params: { email: string; code: string }, ctx) => {
        await ctx.runAction(internal.email.sendOTP, {
          email: params.email,
          code: params.code,
        });
      },
    }),
  ],
});