"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import type { TemplateOption } from "@/components/template-picker";

import { SendEmailDialog } from "./send-email-dialog";

export interface ContactRow {
  id: string;
  name: string | null;
  email: string;
  title: string | null;
  phone: string | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  companyName: string | null;
}

export function ContactsTable({
  data,
  templates,
}: {
  data: ContactRow[];
  templates: TemplateOption[];
}) {
  const [selectedRows, setSelectedRows] = useState<ContactRow[]>([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);

  const columns = useMemo<ColumnDef<ContactRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        meta: { filterVariant: "text" },
      },
      {
        accessorKey: "email",
        header: "Email",
        meta: { filterVariant: "text" },
      },
      {
        accessorKey: "companyName",
        header: "Company",
        meta: { filterVariant: "text" },
      },
      {
        accessorKey: "title",
        header: "Title",
        meta: { filterVariant: "text" },
      },
      {
        accessorKey: "phone",
        header: "Phone",
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          onClick={() => setEmailDialogOpen(true)}
          disabled={selectedRows.length === 0}
        >
          Send Email{selectedRows.length ? ` (${selectedRows.length})` : ""}
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={data}
        enableRowSelection
        onSelectedRowsChange={setSelectedRows}
      />
      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        contacts={selectedRows}
        templates={templates}
      />
    </div>
  );
}
