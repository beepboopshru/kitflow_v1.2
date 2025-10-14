"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

export const sendOTP = internalAction({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("Missing RESEND_API_KEY. Set it in Convex environment variables.");
    }

    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || "ScienceUtsav <onboarding@resend.dev>";
    const to = args.email;

    const subject = "Your ScienceUtsav verification code";
    const text = `Your verification code is: ${args.code}\nThis code will expire shortly.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">Your verification code</h2>
        <p>Use the code below to sign in to ScienceUtsav Management System:</p>
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 6px; padding: 12px 16px; background: #f3f4f6; border-radius: 8px; text-align: center; margin: 16px 0;">
          ${args.code}
        </div>
        <p style="color: #6b7280;">If you didn’t request this, you can safely ignore this email.</p>
      </div>
    `;

    try {
      await resend.emails.send({
        from,
        to: [to],
        subject,
        text,
        html,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to send OTP email: ${message}`);
    }
  },
});
