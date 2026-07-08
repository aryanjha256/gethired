"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import type { Company } from "@/db/schema";

export function CompaniesTable({ data }: { data: Company[] }) {
  const columns = useMemo<ColumnDef<Company>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        meta: { filterVariant: "text" },
      },
      {
        accessorKey: "website",
        header: "Website",
        meta: { filterVariant: "text" },
        cell: ({ getValue }) => {
          const website = getValue<string | null>();
          if (!website) return null;
          return (
            <a
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              {website}
            </a>
          );
        },
      },
      {
        accessorKey: "industry",
        header: "Industry",
        meta: { filterVariant: "text" },
      },
      {
        accessorKey: "location",
        header: "Location",
        meta: { filterVariant: "text" },
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { filterVariant: "text" },
        cell: ({ getValue }) => <Badge variant="secondary">{getValue<string>()}</Badge>,
      },
      {
        accessorKey: "notes",
        header: "Notes",
        meta: { filterVariant: "text" },
      },
      {
        accessorKey: "createdAt",
        header: "Imported",
        meta: { filterVariant: "date" },
        cell: ({ getValue }) => getValue<Date>().toLocaleDateString(),
      },
    ],
    [],
  );

  return <DataTable columns={columns} data={data} />;
}
