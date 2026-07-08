"use client";

import { useMemo, useRef, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileUploadIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { DataTable } from "@/components/data-table";
import {
  parseSpreadsheetFile,
  type ParsedSpreadsheet,
  type SpreadsheetCell,
} from "@/lib/spreadsheet";

function formatCell(value: SpreadsheetCell) {
  if (value instanceof Date) return value.toLocaleDateString();
  return value;
}

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedSpreadsheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const columns = useMemo<ColumnDef<Record<string, SpreadsheetCell>>[]>(
    () =>
      (parsed?.columns ?? []).map(({ key, type }) => ({
        accessorKey: key,
        header: key,
        meta: {
          filterVariant: type === "string" ? "text" : type,
        },
        cell: ({ getValue }) => formatCell(getValue() as SpreadsheetCell),
      })),
    [parsed],
  );

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsParsing(true);
    setError(null);
    try {
      const result = await parseSpreadsheetFile(file);
      setParsed(result);
      setFileName(file.name);
    } catch {
      setError(
        "Couldn't read that file. Make sure it's a valid CSV or Excel file.",
      );
      setParsed(null);
      setFileName(null);
    } finally {
      setIsParsing(false);
    }
  }

  function reset() {
    setParsed(null);
    setFileName(null);
    setError(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      {parsed ? (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading text-lg font-medium tracking-tight">
                {fileName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"},{" "}
                {parsed.columns.length} column
                {parsed.columns.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button variant="outline" onClick={reset}>
              Upload another file
            </Button>
          </div>
          <DataTable columns={columns} data={parsed.rows} enableRowSelection />
        </>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={FileUploadIcon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>Import a spreadsheet</EmptyTitle>
            <EmptyDescription>
              Upload a CSV or Excel file to preview its contents as a table.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={isParsing}
            >
              {isParsing ? "Parsing..." : "Choose file"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
