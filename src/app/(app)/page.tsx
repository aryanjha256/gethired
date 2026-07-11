import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { companies, contacts, emails } from "@/db/schema";
import { buildDailySendCounts, buildStatusChartData } from "@/lib/dashboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { EmailsTrendChart } from "./emails-trend-chart";
import { StatusBarChart } from "./status-bar-chart";

const TREND_DAYS = 14;

// Every number here changes as soon as you import contacts or send emails,
// so this must never be served from a stale build-time cache.
export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm">
      <CardContent>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-heading text-2xl font-medium tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [
    [{ count: contactsCount }],
    [{ count: companiesCount }],
    statusCounts,
    [{ count: interviewingCompanies }],
    [{ count: failedCount }],
    recentEmails,
    recentSends,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(contacts),
    db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(companies),
    db
      .select({ status: contacts.status, count: sql<number>`count(*)`.mapWith(Number) })
      .from(contacts)
      .groupBy(contacts.status),
    db
      .select({ count: sql<number>`count(distinct ${contacts.companyId})`.mapWith(Number) })
      .from(contacts)
      .where(eq(contacts.status, "interviewing")),
    db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(emails).where(eq(emails.status, "failed")),
    db
      .select({
        id: emails.id,
        to: emails.to,
        subject: emails.subject,
        status: emails.status,
        createdAt: emails.createdAt,
        contactName: contacts.name,
        companyName: companies.name,
      })
      .from(emails)
      .leftJoin(contacts, eq(emails.contactId, contacts.id))
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .orderBy(desc(emails.createdAt))
      .limit(8),
    db
      .select({ createdAt: emails.createdAt })
      .from(emails)
      .where(
        sql`${emails.status} = 'sent' AND ${emails.createdAt} >= now() - interval '1 day' * ${TREND_DAYS}`,
      ),
  ]);

  const statusChartData = buildStatusChartData(statusCounts);
  const trendChartData = buildDailySendCounts(
    recentSends.map((row) => row.createdAt),
    TREND_DAYS,
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="font-heading text-lg font-medium tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">An overview of your outreach.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Contacts" value={contactsCount} />
        <StatCard label="Companies" value={companiesCount} />
        <StatCard label="Interviewing" value={interviewingCompanies} />
        <StatCard label="Failed sends" value={failedCount} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Emails sent (last {TREND_DAYS} days)</CardTitle>
          </CardHeader>
          <CardContent>
            <EmailsTrendChart data={trendChartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacts by status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBarChart data={statusChartData} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {recentEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emails sent yet.</p>
          ) : (
            recentEmails.map((email) => (
              <div key={email.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{email.contactName ?? email.to}</p>
                  <p className="truncate text-muted-foreground">
                    {email.subject}
                    {email.companyName ? ` — ${email.companyName}` : ""}
                  </p>
                </div>
                <Badge
                  variant={email.status === "failed" ? "destructive" : "secondary"}
                  className="shrink-0"
                >
                  {email.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
