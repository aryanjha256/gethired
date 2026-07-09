import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { companies, contacts } from "@/db/schema";

import { ContactsTable } from "./contacts-table";

// Contact data changes whenever the Import screen approves new rows, so this
// page must never be served from a stale build-time cache.
export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const data = await db
    .select({
      id: contacts.id,
      name: contacts.name,
      email: contacts.email,
      title: contacts.title,
      phone: contacts.phone,
      status: contacts.status,
      notes: contacts.notes,
      createdAt: contacts.createdAt,
      companyName: companies.name,
    })
    .from(contacts)
    .leftJoin(companies, eq(contacts.companyId, companies.id))
    .orderBy(desc(contacts.createdAt));

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-lg font-medium tracking-tight">Contacts</h1>
        <p className="text-sm text-muted-foreground">
          {data.length} contact{data.length === 1 ? "" : "s"}
        </p>
      </div>
      <ContactsTable data={data} />
    </div>
  );
}
