import { desc } from "drizzle-orm";

import { db } from "@/db";
import { companies } from "@/db/schema";

import { CompaniesTable } from "./companies-table";

// Company data changes whenever the Import screen approves new rows, so this
// page must never be served from a stale build-time cache.
export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const data = await db.select().from(companies).orderBy(desc(companies.createdAt));

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
