import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { emails } from "@/db/schema";
import { sendMail } from "@/lib/mailer";

interface ClaimedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
}

// Atomically claims up to `limit` queued rows so a concurrent drain (the
// after()-triggered one and a client poll can land at nearly the same time)
// never double-sends the same email. Contact status is no longer touched
// here — enqueueContactEmails advances it synchronously at enqueue time, so
// drain is purely "send what's queued."
async function claimQueuedEmails(limit: number): Promise<ClaimedEmail[]> {
  const result = await db.execute(sql`
    UPDATE emails
    SET status = 'sending'
    WHERE id IN (
      SELECT id FROM emails
      WHERE status = 'queued'
      ORDER BY created_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "to", subject, body
  `);

  return Array.from(result) as unknown as ClaimedEmail[];
}

export async function drainEmailQueue({ limit = 5 }: { limit?: number } = {}) {
  const claimed = await claimQueuedEmails(limit);

  for (const row of claimed) {
    try {
      await sendMail({ to: row.to, subject: row.subject, text: row.body });
      await db.update(emails).set({ status: "sent" }).where(eq(emails.id, row.id));
    } catch (error) {
      await db
        .update(emails)
        .set({
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(emails.id, row.id));
    }
  }

  const [{ count: remainingQueued }] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(emails)
    .where(eq(emails.status, "queued"));

  return { processed: claimed.length, remainingQueued };
}
