import type { Contact } from "@/db/schema";

export const CONTACT_STATUSES: { value: Contact["status"]; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "followed_up", label: "Followed Up" },
  { value: "replied", label: "Replied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "no_opening", label: "No Opening" },
  { value: "bounced", label: "Bounced" },
  { value: "closed", label: "Closed" },
];

export function contactStatusLabel(value: string): string {
  return CONTACT_STATUSES.find((s) => s.value === value)?.label ?? value;
}

export interface EnqueueResult {
  queued: number;
  skippedNoMatch: number;
  skippedSequenceMismatch: number;
  skippedCompanyCooldown: number;
}

// Shared toast copy for the "Send Email" dialog on /contacts.
export function describeEnqueueResult(result: EnqueueResult): string {
  if (result.queued === 0) {
    return "Nothing was queued — check the recipients' status and try again.";
  }

  const parts = [`Queued ${result.queued} email${result.queued === 1 ? "" : "s"}`];
  if (result.skippedSequenceMismatch > 0) {
    parts.push(`${result.skippedSequenceMismatch} skipped (already contacted)`);
  }
  if (result.skippedCompanyCooldown > 0) {
    parts.push(`${result.skippedCompanyCooldown} skipped (company on cooldown)`);
  }
  return parts.join(", ");
}

// Not a component/hook, so calling Date.now() here doesn't trip the React
// Compiler's purity check the way doing it inline in a page/component body
// would — callers (e.g. the Companies page) compute this once server-side.
export function computeCooldownDaysLeft(
  noOpeningAt: Date | null,
  retryCooldownDays: number,
): number | null {
  if (noOpeningAt == null) return null;
  const daysLeft = Math.ceil(
    retryCooldownDays - (Date.now() - noOpeningAt.getTime()) / (24 * 60 * 60 * 1000),
  );
  return Math.max(0, daysLeft);
}
