// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Email } from "@convex-dev/auth/providers/Email";
import { Password } from "@convex-dev/auth/providers/Password";
import { internal } from "./_generated/api";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous,
    Email({
      id: "email-otp",
      apiKey: process.env.RESEND_API_KEY,
      maxAge: 60 * 15, // 15 minutes
      async generateVerificationToken() {
        // Generate a 6-digit numeric OTP
        return Math.floor(100000 + Math.random() * 900000).toString();
      },
      async sendVerificationRequest({ identifier, token }: any) {
        // Use the internal Resend action to send the OTP
        await this.scheduler.runAfter(0, internal.email.sendOTP, {
          email: identifier,
          code: token,
        });
      },
    } as any),
    Password,
  ],
});