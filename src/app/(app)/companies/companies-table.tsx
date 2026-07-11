"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";

export interface CompanyRow {
  id: string;
  name: string;
  domain: string | null;
  contactCount: number;
  interviewingCount: number;
  // Precomputed server-side (see page.tsx) so this client component never
  // needs to call Date.now() during render.
  cooldownDaysLeft: number | null;
}

function CompanyStatusBadge({ row }: { row: CompanyRow }) {
  if (row.interviewingCount > 0) {
    return (
      <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">
        Interviewing
      </Badge>
    );
  }

  if (row.cooldownDaysLeft != null && row.cooldownDaysLeft > 0) {
    return <Badge variant="outline">Cooldown ({row.cooldownDaysLeft}d left)</Badge>;
  }

  return null;
}

export function CompaniesTable({ data }: { data: CompanyRow[] }) {
  const columns = useMemo<ColumnDef<CompanyRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Company",
        meta: { filterVariant: "text" },
      },
      {
        accessorKey: "domain",
        header: "Domain",
        meta: { filterVariant: "text" },
        cell: ({ getValue }) => getValue<string | null>() ?? "—",
      },
      {
        accessorKey: "contactCount",
        header: "Contacts",
        meta: { filterVariant: "number" },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <CompanyStatusBadge row={row.original} />,
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={data} />;
}
