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

  return (
    <Badge variant="outline" className="text-muted-foreground">
      Open
    </Badge>
  );
}

export function CompaniesTable({ data }: { data: CompanyRow[] }) {
  const columns = useMemo<ColumnDef<CompanyRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Company",
        meta: { filterVariant: "text", searchable: true },
      },
      {
        accessorKey: "domain",
        header: "Domain",
        meta: { filterVariant: "text", searchable: true },
        cell: ({ getValue }) => {
          const domain = getValue<string | null>();
          if (!domain) return <span className="text-muted-foreground">—</span>;
          return (
            <a
              href={`https://${domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {domain}
            </a>
          );
        },
      },
      {
        accessorKey: "contactCount",
        header: "Contacts",
        meta: { filterVariant: "number" },
      },
      {
        accessorKey: "interviewingCount",
        header: "Interviewing",
        meta: { filterVariant: "number" },
        cell: ({ getValue }) => {
          const count = getValue<number>();
          return count > 0 ? count : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <CompanyStatusBadge row={row.original} />,
      },
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      enableGlobalSearch
      searchPlaceholder="Search companies..."
    />
  );
}
