import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { appSettings, companies, contacts } from "@/db/schema";
import { computeCooldownDaysLeft } from "@/lib/contacts";

import { CompaniesTable } from "./companies-table";

// Company-derived stats (contact count, interviewing/cooldown status) change
// whenever contacts are imported or their status changes, so this must never
// be served from a stale build-time cache.
export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, "singleton"));
  const retryCooldownDays = settings?.retryCooldownDays ?? 45;

  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
      noOpeningAt: companies.noOpeningAt,
      contactCount: sql<number>`count(${contacts.id})`.mapWith(Number),
      interviewingCount: sql<number>`count(*) filter (where ${contacts.status} = 'interviewing')`.mapWith(
        Number,
      ),
    })
    .from(companies)
    .leftJoin(contacts, eq(contacts.companyId, companies.id))
    .groupBy(companies.id)
    .orderBy(asc(companies.name));

  const data = rows.map(({ noOpeningAt, ...row }) => ({
    ...row,
    cooldownDaysLeft: computeCooldownDaysLeft(noOpeningAt, retryCooldownDays),
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-lg font-medium tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">
          {data.length} compan{data.length === 1 ? "y" : "ies"}
        </p>
      </div>
      <CompaniesTable data={data} />
    </div>
  );
}
