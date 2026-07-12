import { text as streamToText } from "node:stream/consumers";
import { ImapFlow, type MessageStructureObject } from "imapflow";

const SEARCH_WINDOW_DAYS = 30;

// Matched on sender only, deliberately not subject too: every bounce this
// app will ever see is relayed through Gmail's own mailer-daemon address (a
// strict, universal MTA convention), so the sender check alone is both
// sufficient and precise. An earlier version also OR'd in a subject regex
// (delivery failure/undelivered/returned mail) — those are exactly the
// words that show up in a normal inbox's years of unrelated e-commerce/
// shipping emails ("delivery failed, we'll retry", "item undelivered"),
// so it was flooding the bounce-candidate list with false positives, each
// one paying for a real bodyStructure fetch + download that finds nothing.
const BOUNCE_SENDER_PATTERN = /mailer-daemon|postmaster/i;

export interface InboxScanResult {
  // Latest message date seen per address (not just presence) — lets the
  // caller ignore a stale match that predates the most recent email
  // actually sent to that contact (e.g. a leftover reply/bounce from an
  // earlier dev-testing round still inside the 30-day window).
  repliedAddresses: Map<string, Date | undefined>;
  bouncedAddresses: Map<string, Date | undefined>;
}

function keepLatest(map: Map<string, Date | undefined>, address: string, date: Date | undefined) {
  const existing = map.get(address);
  if (!existing || (date && date > existing)) map.set(address, date);
}

function getImapClient() {
  const { IMAP_HOST, IMAP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!IMAP_HOST || !IMAP_PORT || !SMTP_USER || !SMTP_PASSWORD) {
    throw new Error(
      "IMAP is not configured — set IMAP_HOST, IMAP_PORT, SMTP_USER, and SMTP_PASSWORD in .env.local",
    );
  }

  return new ImapFlow({
    host: IMAP_HOST,
    port: Number(IMAP_PORT),
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    logger: false,
  });
}

// Recurses a message's MIME structure looking for the RFC 3464
// message/delivery-status part every standard bounce notice carries.
function findDeliveryStatusPart(
  node: MessageStructureObject | undefined,
): MessageStructureObject | undefined {
  if (!node) return undefined;
  if (node.type?.toLowerCase() === "message/delivery-status") return node;
  for (const child of node.childNodes ?? []) {
    const found = findDeliveryStatusPart(child);
    if (found) return found;
  }
  return undefined;
}

// Best-effort: pulls the failed recipient straight out of the DSN's
// Final-Recipient field. Returns undefined for non-standard bounce formats,
// or when the DSN isn't a genuine permanent failure — rather than throwing,
// since one unparseable/non-bounce message shouldn't fail the scan.
async function extractBouncedAddress(
  client: ImapFlow,
  uid: number,
  bodyStructure: MessageStructureObject | undefined,
): Promise<string | undefined> {
  const part = findDeliveryStatusPart(bodyStructure);
  if (!part?.part) return undefined;

  const { content } = await client.download(String(uid), part.part, { uid: true });
  const statusText = await streamToText(content);

  // RFC 3464's Action field is the authoritative signal — "delayed" means
  // Gmail is still retrying, not that the message actually failed. Only
  // "failed" is a genuine, permanent bounce.
  const action = statusText.match(/^Action:\s*(\S+)/im)?.[1]?.toLowerCase();
  if (action !== "failed") return undefined;

  const match = statusText.match(/Final-Recipient:\s*rfc822;\s*(.+)/i);
  return match?.[1]?.trim().toLowerCase();
}

// Reads the inbox for reply/bounce detection only — a fresh
// connect/scan/disconnect per call, not a pooled client like mailer.ts's
// SMTP transporter, since this only runs when "Check for replies" is
// clicked, not on every send.
//
// Deliberately split into fully separate fetch passes, never interleaved:
// issuing a new IMAP command (a second fetch, or download()) while a prior
// fetch()'s async generator is still being consumed confuses the
// connection — that was the actual cause of an earlier 500 + ~5 minute
// hang, not the bounce-detection logic itself. Each `for await` loop below
// is completely drained before any further command is sent.
export async function scanInbox(): Promise<InboxScanResult> {
  const client = getImapClient();
  const repliedAddresses = new Map<string, Date | undefined>();
  const bouncedAddresses = new Map<string, Date | undefined>();

  await client.connect();
  try {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      const uids = await client.search({ since });

      if (uids) {
        const bounceCandidateUids: number[] = [];
        const bounceCandidateDates = new Map<number, Date | undefined>();

        // Pass 1: envelope only (cheap) for every message in the window —
        // classifies bounce-shaped vs. everything else.
        for await (const message of client.fetch(uids, { envelope: true })) {
          const from = message.envelope?.from?.[0]?.address?.toLowerCase();
          const date = message.envelope?.date;
          const looksLikeBounce = Boolean(from && BOUNCE_SENDER_PATTERN.test(from));

          if (looksLikeBounce) {
            bounceCandidateUids.push(message.uid);
            bounceCandidateDates.set(message.uid, date);
          } else if (from) {
            keepLatest(repliedAddresses, from, date);
          }
        }

        if (bounceCandidateUids.length > 0) {
          const structures = new Map<number, MessageStructureObject | undefined>();

          // Pass 2: bodyStructure only for the (small) bounce-shaped
          // subset — avoids paying that cost for every ordinary email.
          for await (const message of client.fetch(
            bounceCandidateUids,
            { bodyStructure: true },
            { uid: true },
          )) {
            structures.set(message.uid, message.bodyStructure);
          }

          // Pass 3: download the delivery-status part per candidate, only
          // after the fetch above has fully finished.
          for (const uid of bounceCandidateUids) {
            const address = await extractBouncedAddress(client, uid, structures.get(uid));
            if (address) keepLatest(bouncedAddresses, address, bounceCandidateDates.get(uid));
          }
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { repliedAddresses, bouncedAddresses };
}
