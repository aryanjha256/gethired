"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { after } from "next/server";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { appSettings, companies, type Contact, contacts, emails, templates } from "@/db/schema";
import { drainEmailQueue } from "@/lib/email-queue";
import { ALLOWED_STATUS_TRANSITIONS } from "@/lib/contacts";
import { scanInbox } from "@/lib/mailbox";
import { renderTemplate, type TemplateContext } from "@/lib/templates";

const REPLY_ELIGIBLE_STATUSES: Contact["status"][] = ["contacted", "followed_up"];

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
  const [contact] = await db
    .select({ status: contacts.status, companyId: contacts.companyId })
    .from(contacts)
    .where(eq(contacts.id, contactId));
  if (!contact) return;

  // The Select on /contacts already only offers valid next statuses, but
  // that's UX, not enforcement — this is the one place the rule is
  // actually authoritative.
  if (status !== contact.status && !ALLOWED_STATUS_TRANSITIONS[contact.status].includes(status)) {
    throw new Error(`Cannot move a "${contact.status}" contact to "${status}"`);
  }

  await db
    .update(contacts)
    .set({ status })
    .where(and(eq(contacts.id, contactId), eq(contacts.status, contact.status)));

  if (status === "no_opening" && contact.companyId) {
    await db
      .update(companies)
      .set({ noOpeningAt: new Date() })
      .where(eq(companies.id, contact.companyId));
  }

  revalidatePath("/contacts");
}

export interface InboxMatch {
  id: string;
  name: string | null;
  email: string;
  status: "replied" | "bounced";
}

// Best-effort reply + bounce detection: scans the sending inbox (via IMAP)
// and reports matching contacts — does NOT write anything. The caller
// (the "Check for replies" confirmation dialog) decides whether to apply
// these via applyInboxMatches. Address-match only, no Message-ID threading
// — scoping "replied" to REPLY_ELIGIBLE_STATUSES keeps it safe (a contact
// who never got an email can't match, and one already past this stage
// won't get re-matched on a later scan). "Bounced" is scoped to anything
// not already closed/bounced — see the plan notes on why
// interviewing/replied aren't excluded from that (accepted edge case, not
// a gap).
//
// A match is also dropped if the inbox message predates the most recent
// email actually sent to that contact — otherwise a stale reply/bounce
// still sitting in the 30-day window (e.g. from an earlier dev-testing
// round) could re-match after a contact's status gets reset. If there's no
// "sent" row for the contact at all, the match is dropped too, not allowed
// through: contacts.id is a fresh UUID on every import, so a contact
// re-imported after the DB was wiped/reset always starts with zero `emails`
// history — there's nothing for a leftover inbox message to legitimately
// correlate to, even though the same address may have been emailed before
// the reset.
export async function previewInboxMatches(): Promise<{ matches: InboxMatch[] }> {
  const { repliedAddresses, bouncedAddresses } = await scanInbox();
  if (repliedAddresses.size === 0 && bouncedAddresses.size === 0) {
    return { matches: [] };
  }

  const candidates = await db
    .select({ id: contacts.id, name: contacts.name, email: contacts.email, status: contacts.status })
    .from(contacts);

  const lastSentRows = await db
    .select({
      contactId: emails.contactId,
      lastSentAt: sql<Date>`max(${emails.createdAt})`.as("lastSentAt"),
    })
    .from(emails)
    .where(eq(emails.status, "sent"))
    .groupBy(emails.contactId);
  const lastSentByContactId = new Map(
    lastSentRows.filter((row) => row.contactId).map((row) => [row.contactId as string, row.lastSentAt]),
  );

  function isFreshMatch(contactId: string, messageDate: Date | undefined) {
    const lastSentAt = lastSentByContactId.get(contactId);
    if (!lastSentAt) return false;
    return !messageDate || messageDate > lastSentAt;
  }

  const replied = candidates.filter(
    (contact) =>
      REPLY_ELIGIBLE_STATUSES.includes(contact.status) &&
      repliedAddresses.has(contact.email.toLowerCase()) &&
      isFreshMatch(contact.id, repliedAddresses.get(contact.email.toLowerCase())),
  );
  const repliedIds = new Set(replied.map((contact) => contact.id));

  const bounced = candidates.filter(
    (contact) =>
      !ALWAYS_BLOCKED_STATUSES.includes(contact.status) &&
      !repliedIds.has(contact.id) &&
      bouncedAddresses.has(contact.email.toLowerCase()) &&
      isFreshMatch(contact.id, bouncedAddresses.get(contact.email.toLowerCase())),
  );

  const matches: InboxMatch[] = [
    ...replied.map((c) => ({ id: c.id, name: c.name, email: c.email, status: "replied" as const })),
    ...bounced.map((c) => ({ id: c.id, name: c.name, email: c.email, status: "bounced" as const })),
  ];

  return { matches };
}

// Commits a set of matches the user has reviewed and confirmed in the
// "Check for replies" dialog.
export async function applyInboxMatches(matches: Pick<InboxMatch, "id" | "status">[]) {
  const repliedIds = matches.filter((m) => m.status === "replied").map((m) => m.id);
  const bouncedIds = matches.filter((m) => m.status === "bounced").map((m) => m.id);

  if (repliedIds.length > 0) {
    await db.update(contacts).set({ status: "replied" }).where(inArray(contacts.id, repliedIds));
  }
  if (bouncedIds.length > 0) {
    await db.update(contacts).set({ status: "bounced" }).where(inArray(contacts.id, bouncedIds));
  }
  if (repliedIds.length > 0 || bouncedIds.length > 0) {
    revalidatePath("/contacts");
  }

  return { repliedCount: repliedIds.length, bouncedCount: bouncedIds.length };
}
