"use server";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { appSettings, companies, contacts, emails } from "@/db/schema";
import { sendMail } from "@/lib/mailer";
import { renderTemplate, type TemplateContext } from "@/lib/templates";

export async function sendContactEmails(
  contactIds: string[],
  subject: string,
  body: string,
  templateId?: string | null,
) {
  const targets = await db
    .select({
      id: contacts.id,
      email: contacts.email,
      name: contacts.name,
      title: contacts.title,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(inArray(contacts.id, contactIds));

  const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, "singleton"));

  let sent = 0;
  let failed = 0;
  let skipped = contactIds.length - targets.length;

  for (const contact of targets) {
    if (!contact.email) {
      skipped++;
      continue;
    }

    const ctx: TemplateContext = {
      contact: { name: contact.name ?? "", email: contact.email, title: contact.title ?? "" },
      companyName: contact.companyName ?? "",
      sender: { name: settings?.senderName ?? "", signature: settings?.signature ?? "" },
    };
    const renderedSubject = renderTemplate(subject, ctx);
    const renderedBody = renderTemplate(body, ctx);

    try {
      await sendMail({ to: contact.email, subject: renderedSubject, text: renderedBody });
      await db.insert(emails).values({
        contactId: contact.id,
        templateId: templateId ?? null,
        to: contact.email,
        subject: renderedSubject,
        body: renderedBody,
        status: "sent",
      });
      sent++;
    } catch (error) {
      failed++;
      await db.insert(emails).values({
        contactId: contact.id,
        templateId: templateId ?? null,
        to: contact.email,
        subject: renderedSubject,
        body: renderedBody,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return { sent, failed, skipped };
}
