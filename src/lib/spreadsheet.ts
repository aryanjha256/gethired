import * as XLSX from "xlsx"

export type SpreadsheetCell = string | number | boolean | Date | null

// What a row looks like once it's crossed a Server Action boundary — Date
// isn't a plain object, so it can't be passed from a Client Component to a
// Server Function and must be converted first (see serializeSpreadsheetRow).
export type SerializedSpreadsheetCell = string | number | boolean | null

export type ColumnType = "string" | "number" | "date"

export interface SpreadsheetColumn {
  key: string
  type: ColumnType
}

export interface ParsedSpreadsheet {
  columns: SpreadsheetColumn[]
  rows: Record<string, SpreadsheetCell>[]
}

const NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/
const DATE_PATTERN =
  /^\d{4}-\d{1,2}-\d{1,2}(T.*)?$|^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/

function detectColumnType(values: SpreadsheetCell[]): ColumnType {
  const nonEmpty = values.filter((value) => value !== null && value !== "")
  if (nonEmpty.length === 0) return "string"

  if (nonEmpty.every((value) => value instanceof Date)) {
    return "date"
  }

  if (
    nonEmpty.every(
      (value) =>
        typeof value === "number" ||
        (typeof value === "string" && NUMERIC_PATTERN.test(value.trim()))
    )
  ) {
    return "number"
  }

  if (
    nonEmpty.every(
      (value) =>
        typeof value === "string" &&
        DATE_PATTERN.test(value.trim()) &&
        !Number.isNaN(Date.parse(value))
    )
  ) {
    return "date"
  }

  return "string"
}

function workbookToParsed(workbook: XLSX.WorkBook): ParsedSpreadsheet {
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, SpreadsheetCell>>(
    sheet,
    { defval: "" }
  )
  const keys = rows.length > 0 ? Object.keys(rows[0]) : []
  const columns = keys.map((key) => ({
    key,
    type: detectColumnType(rows.map((row) => row[key])),
  }))

  return { columns, rows }
}

export async function parseSpreadsheetFile(
  file: File
): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  return workbookToParsed(workbook)
}

export function parseSpreadsheetText(text: string): ParsedSpreadsheet {
  const trimmed = text.trim()
  if (!trimmed) {
    return { columns: [], rows: [] }
  }
  const workbook = XLSX.read(trimmed, { type: "string", cellDates: true })
  return workbookToParsed(workbook)
}

export function serializeSpreadsheetRow(
  row: Record<string, SpreadsheetCell>
): Record<string, SerializedSpreadsheetCell> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ])
  )
}
