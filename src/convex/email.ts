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
    // Initialize Resend safely at runtime to avoid push-time env errors
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set. Go to Integrations → Resend to configure it.");
    }
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || "ScienceUtsav <onboarding@resend.dev>";

    try {
      const { data, error } = await resend.emails.send({
        from: nuoto.ai@gmail.com
        to: [args.email],
        subject: "Sign in to ScienceUtsav Management System",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px;">ScienceUtsav</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Management System</p>
              </div>
              
              <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1f2937; margin-top: 0;">Sign in to your account</h2>
                <p style="color: #6b7280; font-size: 16px;">Please enter the following verification code on the sign in page:</p>
                
                <div style="background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                  <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1f2937; font-family: 'Courier New', monospace;">
                    ${args.code}
                  </div>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  <strong>This code is valid for 1 hour.</strong>
                </p>
                
                <p style="color: #9ca3af; font-size: 13px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  If you didn't request this code, you can safely ignore this email. Someone else might have typed your email address by mistake.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                <p>© ${new Date().getFullYear()} ScienceUtsav Management System. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error("Resend error:", error);
        throw new Error(`Failed to send email: ${(error as any).message ?? "Unknown Resend error"}`);
      }

      return { success: true, messageId: data?.id };
    } catch (error) {
      console.error("Error sending OTP email:", error);
      throw error;
    }
  },
});