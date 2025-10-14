"use node";

import { Resend } from "resend";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendOTP = internalAction({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "ScienceUtsav <onboarding@resend.dev>";

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [args.email],
        subject: "Your verification code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your verification code</h2>
            <p>Enter this code to sign in to ScienceUtsav Management System:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${args.code}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend error:", error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending OTP email:", error);
      throw error;
    }
  },
});
