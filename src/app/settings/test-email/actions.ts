"use server";

import { sendMail } from "@/lib/mailer";

export async function sendTestEmail(to: string, subject: string, body: string) {
  try {
    await sendMail({ to, subject, text: body });
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
