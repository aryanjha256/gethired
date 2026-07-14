"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileUploadIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table";
import {
  parseSpreadsheetFile,
  parseSpreadsheetText,
  serializeSpreadsheetRow,
  type ParsedSpreadsheet,
  type SpreadsheetCell,
} from "@/lib/spreadsheet";

import { approveContacts } from "./actions";

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
  const [pastedText, setPastedText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Record<string, SpreadsheetCell>[]>([]);
  const [isApproving, startApproving] = useTransition();

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

  async function parseFile(file: File) {
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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) parseFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) parseFile(file);
  }

  function handlePaste() {
    setIsParsing(true);
    setError(null);
    try {
      const result = parseSpreadsheetText(pastedText);
      if (result.rows.length === 0) {
        setError(
          "Couldn't find any rows. Paste CSV text including a header row.",
        );
        return;
      }
      setParsed(result);
      setFileName("Pasted data");
    } catch {
      setError("Couldn't read that. Make sure it's valid CSV text.");
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
    setPastedText("");
    setSelectedRows([]);
  }

  function handleApprove() {
    startApproving(async () => {
      const result = await approveContacts(
        selectedRows.map(serializeSpreadsheetRow),
        fileName ?? undefined,
      );
      const skipped = result.skippedNoEmail + result.skippedDuplicate;
      if (result.inserted > 0) {
        toast.success(
          `Imported ${result.inserted} contact${result.inserted === 1 ? "" : "s"} to Contacts` +
            (skipped > 0 ? ` (${skipped} skipped)` : ""),
        );
      } else {
        toast.error(
          result.skippedDuplicate > 0
            ? "Nothing was imported — those contacts already exist (matched by email)."
            : "Nothing was imported — none of the selected rows had a recognizable email column.",
        );
      }
    });
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
            <div className="flex items-center gap-2">
              <Button
                onClick={handleApprove}
                disabled={selectedRows.length === 0 || isApproving}
              >
                {isApproving
                  ? "Importing..."
                  : `Import to Contacts${selectedRows.length ? ` (${selectedRows.length})` : ""}`}
              </Button>
              <Button variant="outline" onClick={reset}>
                Start over
              </Button>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={parsed.rows}
            enableRowSelection
            onSelectedRowsChange={setSelectedRows}
          />
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-lg">
            <div className="mb-6 flex flex-col items-center gap-2 text-center">
              <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                <HugeiconsIcon
                  icon={FileUploadIcon}
                  strokeWidth={2}
                  className="size-5"
                />
              </div>
              <h1 className="font-heading text-lg font-medium tracking-tight">
                Import a spreadsheet
              </h1>
              <p className="max-w-sm text-sm/relaxed text-muted-foreground text-balance">
                Upload a CSV or Excel file, or paste CSV text, to preview its
                contents as a table.
              </p>
            </div>
            <Tabs defaultValue="file">
              <TabsList className="w-full">
                <TabsTrigger value="file">Upload file</TabsTrigger>
                <TabsTrigger value="paste">Paste CSV</TabsTrigger>
              </TabsList>
              <TabsContent value="file" className="mt-4">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  disabled={isParsing}
                  className={cn(
                    "flex min-h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:bg-muted/40 disabled:pointer-events-none disabled:opacity-60",
                    isDragging && "border-primary bg-muted/40 text-foreground",
                  )}
                >
                  <HugeiconsIcon icon={FileUploadIcon} className="size-6" />
                  <span className="font-medium text-foreground">
                    {isParsing
                      ? "Parsing..."
                      : isDragging
                        ? "Drop to import"
                        : "Click to choose a file"}
                  </span>
                  <span className="text-xs">or drag and drop · CSV, XLSX, XLS</span>
                </button>
              </TabsContent>
              <TabsContent value="paste" className="mt-4 flex flex-col gap-3">
                <Textarea
                  value={pastedText}
                  onChange={(event) => setPastedText(event.target.value)}
                  placeholder={"name,email,company\nAda Lovelace,ada@example.com,Analytical Engines"}
                  className="min-h-44 resize-none font-mono text-xs"
                />
                <Button
                  onClick={handlePaste}
                  disabled={isParsing || pastedText.trim().length === 0}
                  className="self-end"
                >
                  {isParsing ? "Parsing..." : "Preview"}
                </Button>
              </TabsContent>
            </Tabs>
            {error && (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
