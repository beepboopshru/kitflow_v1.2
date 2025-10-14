// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";
/* Email provider import removed to avoid bundling node-only deps; using inline email config */
import { internal } from "./_generated/api";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous,
    Password({
      id: "password",
      // Use an inline Email provider config and send codes via our Resend-backed action
      verify: (ctx: any) => ({
        id: "resend-otp",
        type: "email",
        name: "Email",
        // Generate a 6-digit numeric OTP to match the UI input
        async generateVerificationToken() {
          const digits = "0123456789";
          let code = "";
          for (let i = 0; i < 6; i++) {
            code += digits[Math.floor(Math.random() * digits.length)];
          }
          return code;
        },
        // Dispatch the OTP email through our Node action (Resend)
        async sendVerificationRequest(params: { identifier: string; token: string }) {
          const { identifier, token } = params;
          await ctx.runAction(internal.email.sendOTP, {
            email: identifier,
            code: token,
          });
        },
      }),
    }),
  ],
});