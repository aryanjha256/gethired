import * as XLSX from "xlsx"

export type SpreadsheetCell = string | number | boolean | Date | null

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

export async function parseSpreadsheetFile(
  file: File
): Promise<ParsedSpreadsheet> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
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
