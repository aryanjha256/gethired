import { eq } from "drizzle-orm";

import { db } from "@/db";
import { companies, contacts } from "@/db/schema";

import { ComposeEmail } from "./compose-email";

// Recipient list must reflect the latest imported/edited contacts, never a
// stale build-time snapshot.
export const dynamic = "force-dynamic";

export default async function EmailsPage() {
  const recipients = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id));

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-lg font-medium tracking-tight">Send Email</h1>
        <p className="text-sm text-muted-foreground">
          Compose a message and send it to one or more contacts.
        </p>
      </div>
      <ComposeEmail recipients={recipients} />
    </div>
  );
}
