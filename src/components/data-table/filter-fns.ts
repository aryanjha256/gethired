import type { FilterFn, RowData } from "@tanstack/react-table"

export interface DataTableFilterOption {
  value: string
  label: string
}

declare module "@tanstack/react-table" {
  // TanStack requires this merged interface to keep its original type parameters.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: "text" | "number" | "date" | "enum"
    filterOptions?: DataTableFilterOption[]
    // Opt a column into the global search box. Works for text and number
    // values alike since matching is done on the stringified cell value.
    searchable?: boolean
  }
  interface FilterFns {
    textFilter: FilterFn<unknown>
    numberFilter: FilterFn<unknown>
    dateFilter: FilterFn<unknown>
    enumFilter: FilterFn<unknown>
    globalSearch: FilterFn<unknown>
  }
}

export type FilterVariant = "text" | "number" | "date" | "enum"

export interface TextFilterValue {
  operator: "contains"
  value?: string
}

export interface NumberFilterValue {
  operator: "eq" | "gt" | "lt" | "between"
  value?: number
  value2?: number
}

export interface DateFilterValue {
  operator: "is" | "before" | "after" | "between"
  value?: string
  value2?: string
}

export interface EnumFilterValue {
  value: string | null
}

export function defaultFilterValue(variant: FilterVariant) {
  if (variant === "number") return { operator: "eq" } satisfies NumberFilterValue
  if (variant === "date") return { operator: "is" } satisfies DateFilterValue
  if (variant === "enum") return { value: null } satisfies EnumFilterValue
  return { operator: "contains" } satisfies TextFilterValue
}

export function filterFnForVariant(
  variant: FilterVariant
): "numberFilter" | "dateFilter" | "enumFilter" | "textFilter" {
  return variant === "number"
    ? "numberFilter"
    : variant === "date"
      ? "dateFilter"
      : variant === "enum"
        ? "enumFilter"
        : "textFilter"
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const textFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  const { value } = (filterValue as TextFilterValue) ?? {}
  if (!value) return true
  return String(row.getValue(columnId) ?? "")
    .toLowerCase()
    .includes(value.toLowerCase())
}
textFilter.autoRemove = (value: TextFilterValue) => !value?.value

const numberFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  const { operator, value, value2 } = (filterValue as NumberFilterValue) ?? {}
  const raw = row.getValue<number>(columnId)
  if (typeof raw !== "number") return false

  switch (operator) {
    case "eq":
      return value == null || raw === value
    case "gt":
      return value == null || raw > value
    case "lt":
      return value == null || raw < value
    case "between":
      return raw >= (value ?? -Infinity) && raw <= (value2 ?? Infinity)
    default:
      return true
  }
}
numberFilter.autoRemove = (value: NumberFilterValue) =>
  !value || (value.value == null && value.value2 == null)

function toTime(iso?: string) {
  return iso ? new Date(iso).getTime() : undefined
}

const dateFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  const { operator, value, value2 } = (filterValue as DateFilterValue) ?? {}
  const raw = row.getValue(columnId)
  const time = raw instanceof Date ? raw.getTime() : new Date(raw as string).getTime()
  if (Number.isNaN(time)) return false

  const from = toTime(value)
  const to = toTime(value2)

  switch (operator) {
    case "is":
      return from == null || (time >= from && time < from + ONE_DAY_MS)
    case "before":
      return from == null || time < from
    case "after":
      return from == null || time >= from + ONE_DAY_MS
    case "between":
      return (
        time >= (from ?? -Infinity) &&
        time <= (to != null ? to + ONE_DAY_MS - 1 : Infinity)
      )
    default:
      return true
  }
}
dateFilter.autoRemove = (value: DateFilterValue) =>
  !value || (!value.value && !value.value2)

// Global search: matches when the stringified cell value contains the query.
// TanStack invokes this once per globally-filterable column and keeps the row
// if any column matches, so a single fn covers both text and number columns.
export const globalSearchFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
  const query = String(filterValue ?? "").trim().toLowerCase()
  if (!query) return true
  const value = row.getValue(columnId)
  if (value == null) return false
  return String(value).toLowerCase().includes(query)
}

const enumFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  const { value } = (filterValue as EnumFilterValue) ?? {}
  if (!value) return true
  return String(row.getValue(columnId) ?? "") === value
}
enumFilter.autoRemove = (value: EnumFilterValue) => !value?.value

export const dataTableFilterFns = {
  textFilter,
  numberFilter,
  dateFilter,
  enumFilter,
  globalSearch: globalSearchFilterFn,
}
