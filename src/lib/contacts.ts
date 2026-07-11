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

// Shared toast copy for the two send surfaces (contacts table + emails
// composer) — both enqueue through the same action and shape of result.
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
