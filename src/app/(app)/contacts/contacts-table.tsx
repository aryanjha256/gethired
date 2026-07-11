"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";

import type { Contact } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TemplateOption } from "@/components/template-picker";
import { CONTACT_STATUSES } from "@/lib/contacts";
import { useDrainEmailQueue } from "@/hooks/use-drain-email-queue";

import { SendEmailDialog } from "./send-email-dialog";
import { updateContactStatus } from "./actions";

export interface ContactRow {
  id: string;
  name: string | null;
  email: string;
  title: string | null;
  phone: string | null;
  status: Contact["status"];
  notes: string | null;
  createdAt: Date;
  companyId: string | null;
  companyName: string | null;
}

export function ContactsTable({
  data,
  templates,
  companiesInterviewing,
}: {
  data: ContactRow[];
  templates: TemplateOption[];
  companiesInterviewing: Set<string>;
}) {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<ContactRow[]>([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const { remaining, startDraining } = useDrainEmailQueue();
  const wasDraining = useRef(false);

  useEffect(() => {
    if (remaining !== null && remaining > 0) {
      wasDraining.current = true;
    } else if (remaining === 0 && wasDraining.current) {
      wasDraining.current = false;
      toast.success("Finished sending queued emails");
      router.refresh();
    }
  }, [remaining, router]);

  async function handleStatusChange(contactId: string, status: Contact["status"]) {
    await updateContactStatus(contactId, status);
    router.refresh();
  }

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
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <span>{row.original.companyName}</span>
            {row.original.companyId && companiesInterviewing.has(row.original.companyId) && (
              <Badge variant="secondary" className="text-emerald-600 dark:text-emerald-400">
                Interviewing
              </Badge>
            )}
          </div>
        ),
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
        cell: ({ row }) => (
          <Select
            value={row.original.status}
            onValueChange={(value) =>
              value && handleStatusChange(row.original.id, value as Contact["status"])
            }
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companiesInterviewing],
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
        onQueued={startDraining}
      />
    </div>
  );
}
