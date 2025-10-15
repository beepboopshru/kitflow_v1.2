// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Email } from "@convex-dev/auth/providers/Email";
import { Resend } from "resend";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous,
    Email({
      id: "email-otp",
      apiKey: process.env.RESEND_API_KEY!,
      maxAge: 60 * 10, // 10 minutes
      async generateVerificationToken() {
        // Generate a more secure 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        return code;
      },
      async sendVerificationRequest({ identifier: email, provider, token }) {
        const apiKey = (await (provider as any).apiKey) ?? process.env.RESEND_API_KEY!;
        const resend = new Resend(apiKey);
        const code = token;

        await resend.emails.send({
          from: "ScienceUtsav <noreply@yourdomain.com>",
          to: [email],
          subject: "Your verification code",
          html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your verification code</h2>
            <p>Enter this code to complete your sign-in:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              For security reasons, never share this code with anyone.
            </p>
          </div>
          `,
        });
      },
    }),
  ],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      // Check if user already exists
      if (args.existingUserId) {
        return args.existingUserId;
      }

      // Create new user with default role and pending approval
      const userId = await ctx.db.insert("users", {
        email: args.profile.email,
        name: args.profile.name,
        image: args.profile.image,
        emailVerificationTime: args.profile.emailVerificationTime,
        isAnonymous: args.profile.isAnonymous,
        role: "inventory", // Default role for new users
        isApproved: false, // New users require admin approval
      });

      return userId;
    },
  },
});