import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { appSettings, companies, contacts } from "@/db/schema";
import { computeCooldownDaysLeft } from "@/lib/contacts";
import { StatCard } from "@/components/stat-card";

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

  const totalContacts = data.reduce((sum, row) => sum + row.contactCount, 0);
  const interviewingCompanies = data.filter((row) => row.interviewingCount > 0).length;
  const inCooldown = data.filter(
    (row) => row.cooldownDaysLeft != null && row.cooldownDaysLeft > 0,
  ).length;

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-lg font-medium tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">
          Every organization you&apos;ve reached out to, with contact volume and outreach status.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Companies" value={data.length} />
        <StatCard label="Contacts" value={totalContacts} />
        <StatCard label="Interviewing" value={interviewingCompanies} />
        <StatCard label="In cooldown" value={inCooldown} />
      </div>

      <CompaniesTable data={data} />
    </div>
  );
}
