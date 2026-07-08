import type { FilterFn, RowData } from "@tanstack/react-table"

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    filterVariant?: "text" | "number" | "date"
  }
  interface FilterFns {
    textFilter: FilterFn<unknown>
    numberFilter: FilterFn<unknown>
    dateFilter: FilterFn<unknown>
  }
}

export type FilterVariant = "text" | "number" | "date"

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

export function defaultFilterValue(variant: FilterVariant) {
  if (variant === "number") return { operator: "eq" } satisfies NumberFilterValue
  if (variant === "date") return { operator: "is" } satisfies DateFilterValue
  return { operator: "contains" } satisfies TextFilterValue
}

export function filterFnForVariant(
  variant: FilterVariant
): "numberFilter" | "dateFilter" | "textFilter" {
  return variant === "number"
    ? "numberFilter"
    : variant === "date"
      ? "dateFilter"
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

export const dataTableFilterFns = { textFilter, numberFilter, dateFilter }
