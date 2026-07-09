"use server";

import { inArray } from "drizzle-orm";

import { db } from "@/db";
import { contacts, emails } from "@/db/schema";
import { sendMail } from "@/lib/mailer";

export async function sendContactEmails(contactIds: string[], subject: string, body: string) {
  const targets = await db.select().from(contacts).where(inArray(contacts.id, contactIds));

  let sent = 0;
  let failed = 0;
  let skipped = contactIds.length - targets.length;

  for (const contact of targets) {
    if (!contact.email) {
      skipped++;
      continue;
    }

    try {
      await sendMail({ to: contact.email, subject, text: body });
      await db.insert(emails).values({
        contactId: contact.id,
        to: contact.email,
        subject,
        body,
        status: "sent",
      });
      sent++;
    } catch (error) {
      failed++;
      await db.insert(emails).values({
        contactId: contact.id,
        to: contact.email,
        subject,
        body,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { sent, failed, skipped };
}
