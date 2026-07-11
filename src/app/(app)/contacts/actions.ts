"use server";

import { and, eq, inArray } from "drizzle-orm";
import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { appSettings, companies, type Contact, contacts, emails, templates } from "@/db/schema";
import { drainEmailQueue } from "@/lib/email-queue";
import { renderTemplate, type TemplateContext } from "@/lib/templates";

const INITIAL_ELIGIBLE_STATUSES: Contact["status"][] = ["new", "no_opening"];
const FOLLOW_UP_ELIGIBLE_STATUSES: Contact["status"][] = ["contacted", "followed_up"];
// A contact in one of these statuses never receives another email — even a
// custom/no-template one — without a deliberate manual status reset first.
const ALWAYS_BLOCKED_STATUSES: Contact["status"][] = ["closed", "bounced"];
const FIRST_DRAIN_BATCH_SIZE = 5;

export async function enqueueContactEmails(
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
      status: contacts.status,
      companyName: companies.name,
      noOpeningAt: companies.noOpeningAt,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .where(inArray(contacts.id, contactIds));

  const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, "singleton"));
  const retryCooldownDays = settings?.retryCooldownDays ?? 45;

  let template: { type: (typeof templates.$inferSelect)["type"] } | undefined;
  if (templateId) {
    [template] = await db.select({ type: templates.type }).from(templates).where(eq(templates.id, templateId));
  }

  let queued = 0;
  let skippedSequenceMismatch = 0;
  let skippedCompanyCooldown = 0;
  const skippedNoMatch = contactIds.length - targets.length;
  const rows: (typeof emails.$inferInsert)[] = [];

  for (const contact of targets) {
    if (!contact.email) continue;

    // A terminal status can't be routed around by picking "no template".
    if (ALWAYS_BLOCKED_STATUSES.includes(contact.status)) {
      skippedSequenceMismatch++;
      continue;
    }

    // Cooldown only gates *fresh* outreach to a contact who hasn't
    // meaningfully progressed (new/no_opening) — it never blocks a contact
    // already mid-conversation (contacted/followed_up/replied/interviewing)
    // just because someone else at the same company said no. One rejection
    // shouldn't freeze an unrelated, already-in-progress thread.
    const isFreshContact = INITIAL_ELIGIBLE_STATUSES.includes(contact.status);
    const cooldownActive =
      contact.noOpeningAt != null &&
      Date.now() - contact.noOpeningAt.getTime() < retryCooldownDays * 24 * 60 * 60 * 1000;
    if (isFreshContact && cooldownActive) {
      skippedCompanyCooldown++;
      continue;
    }

    let nextStatus: Contact["status"] | null = null;
    if (template?.type === "initial") {
      if (!INITIAL_ELIGIBLE_STATUSES.includes(contact.status)) {
        skippedSequenceMismatch++;
        continue;
      }
      nextStatus = "contacted";
    } else if (template?.type === "follow_up") {
      if (!FOLLOW_UP_ELIGIBLE_STATUSES.includes(contact.status)) {
        skippedSequenceMismatch++;
        continue;
      }
      nextStatus = "followed_up";
    }

    const ctx: TemplateContext = {
      contact: { name: contact.name ?? "", email: contact.email, title: contact.title ?? "" },
      companyName: contact.companyName ?? "",
      sender: { name: settings?.senderName ?? "", signature: settings?.signature ?? "" },
    };

    rows.push({
      contactId: contact.id,
      templateId: templateId ?? null,
      to: contact.email,
      subject: renderTemplate(subject, ctx),
      body: renderTemplate(body, ctx),
      status: "queued",
    });
    queued++;

    // Advance status the instant we decide to queue this send (not when it
    // later completes) — closes the race where a second enqueue call, made
    // before the first batch has drained, would otherwise still see the old
    // status and queue a duplicate. Guarded by the same eligible-statuses
    // check so a concurrent manual status change never gets clobbered.
    if (nextStatus === "contacted") {
      await db
        .update(contacts)
        .set({ status: "contacted" })
        .where(and(eq(contacts.id, contact.id), inArray(contacts.status, INITIAL_ELIGIBLE_STATUSES)));
    } else if (nextStatus === "followed_up") {
      await db
        .update(contacts)
        .set({ status: "followed_up" })
        .where(and(eq(contacts.id, contact.id), inArray(contacts.status, FOLLOW_UP_ELIGIBLE_STATUSES)));
    }
  }

  if (rows.length > 0) {
    await db.insert(emails).values(rows);
    after(() => drainEmailQueue({ limit: FIRST_DRAIN_BATCH_SIZE }));
  }

  return { queued, skippedNoMatch, skippedSequenceMismatch, skippedCompanyCooldown };
}

export async function updateContactStatus(contactId: string, status: Contact["status"]) {
  await db.update(contacts).set({ status }).where(eq(contacts.id, contactId));

  if (status === "no_opening") {
    const [contact] = await db
      .select({ companyId: contacts.companyId })
      .from(contacts)
      .where(eq(contacts.id, contactId));

    if (contact?.companyId) {
      await db
        .update(companies)
        .set({ noOpeningAt: new Date() })
        .where(eq(companies.id, contact.companyId));
    }
  }

  revalidatePath("/contacts");
}
