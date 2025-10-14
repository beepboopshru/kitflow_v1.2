// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { internal } from "./_generated/api";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous,
    // Ensure Password provider is configured and typings don't block deploy across versions
    Password(({
      profile(params: any) {
        return {
          email: params.email as string,
          name: params.email as string,
        };
      },
      // Inline email verification flow using Resend via internal action
      email: {
        id: "email",
        type: "email",
        name: "Email",
        sendVerificationRequest: async (params: any, ctx: any) => {
          const { identifier, token } = params;
          await ctx.scheduler.runAfter(0, internal.email.sendOTP, {
            email: identifier,
            code: token,
          });
        },
      },
    }) as any),
  ],
});