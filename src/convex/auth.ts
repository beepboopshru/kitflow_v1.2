// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
import { internal } from "./_generated/api";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous,
    Password({
      id: "email-otp",
      email: () => ({
        id: "resend",
        type: "code",
        name: "Email OTP",
        sendVerificationRequest: async (ctx: any, args: any) => {
          await ctx.runAction(internal.email.sendOTP, { email: args.email, code: args.code });
        },
      }),
    }),
  ],
});