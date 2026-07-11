"use client"

import * as React from "react"
import type {
  Column,
  ColumnFiltersState,
  Table as ReactTableInstance,
} from "@tanstack/react-table"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, FilterHorizontalIcon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { DataTableDatePicker } from "./date-picker"
import { DataTableDragHandle } from "./drag-handle"
import {
  defaultFilterValue,
  type DateFilterValue,
  type NumberFilterValue,
  type TextFilterValue,
} from "./filter-fns"
import { getColumnLabel, useDragReorder } from "./utils"

export function DataTableFilterMenu<TData>({
  table,
  setColumnFilters,
}: {
  table: ReactTableInstance<TData>
  setColumnFilters: React.Dispatch<React.SetStateAction<ColumnFiltersState>>
}) {
  const columnFilters = table.getState().columnFilters
  const filterableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanFilter())
  const { dragHandleProps, dropZoneProps } = useDragReorder(columnFilters, setColumnFilters)

  // Mutating columnFilters via the raw setter (rather than table.setColumnFilters) is
  // intentional: TanStack's setColumnFilters silently drops any filter whose
  // filterFn.autoRemove reports it as "empty" — which is exactly the state a freshly
  // added, not-yet-filled-in filter row starts in.
  function addFilter() {
    const used = new Set(columnFilters.map((filter) => filter.id))
    const next = filterableColumns.find((column) => !used.has(column.id))
    if (!next) return
    const variant = next.columnDef.meta?.filterVariant ?? "text"
    setColumnFilters((old) => [
      ...old,
      { id: next.id, value: defaultFilterValue(variant) },
    ])
  }

  function changeFilterColumn(index: number, columnId: string) {
    const column = filterableColumns.find((c) => c.id === columnId)
    const variant = column?.columnDef.meta?.filterVariant ?? "text"
    setColumnFilters((old) =>
      old.map((filter, i) =>
        i === index ? { id: columnId, value: defaultFilterValue(variant) } : filter
      )
    )
  }

  function updateFilterValue(index: number, value: unknown) {
    setColumnFilters((old) =>
      old.map((filter, i) => (i === index ? { ...filter, value } : filter))
    )
  }

  function removeFilter(index: number) {
    setColumnFilters((old) => old.filter((_, i) => i !== index))
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <HugeiconsIcon icon={FilterHorizontalIcon} strokeWidth={2} />
        Filter
        {columnFilters.length > 0 && (
          <Badge variant="secondary">{columnFilters.length}</Badge>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-96">
        <p className="text-xs font-medium text-muted-foreground">Filters</p>
        <div className="flex flex-col gap-2">
          {columnFilters.length === 0 && (
            <p className="text-sm text-muted-foreground">No filters applied</p>
          )}
          {columnFilters.map((filter, index) => {
            const column = table.getColumn(filter.id)
            if (!column) return null
            return (
              <div
                key={filter.id}
                className="flex items-center gap-2"
                {...dropZoneProps(index)}
              >
                <DataTableDragHandle {...dragHandleProps(index)} />
                <Select
                  value={filter.id}
                  onValueChange={(value) => value && changeFilterColumn(index, value)}
                  items={filterableColumns.map((c) => ({
                    value: c.id,
                    label: getColumnLabel(c),
                  }))}
                >
                  <SelectTrigger size="sm" className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filterableColumns.map((c) => (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                        disabled={columnFilters.some(
                          (f, i) => f.id === c.id && i !== index
                        )}
                      >
                        {getColumnLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DataTableFilterValueEditor
                  column={column}
                  value={filter.value}
                  onChange={(value) => updateFilterValue(index, value)}
                />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeFilter(index)}
                >
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                </Button>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addFilter}
            disabled={columnFilters.length >= filterableColumns.length}
          >
            Add filter
          </Button>
          {columnFilters.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setColumnFilters([])}>
              Reset filters
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function DataTableFilterValueEditor<TData, TValue>({
  column,
  value,
  onChange,
}: {
  column: Column<TData, TValue>
  value: unknown
  onChange: (value: unknown) => void
}) {
  const variant = column.columnDef.meta?.filterVariant ?? "text"

  if (variant === "number") {
    const filterValue = (value as NumberFilterValue) ?? { operator: "eq" }
    return (
      <div className="flex flex-1 gap-1">
        <Select
          value={filterValue.operator}
          onValueChange={(operator) => operator && onChange({ ...filterValue, operator })}
          items={[
            { value: "eq", label: "=" },
            { value: "gt", label: ">" },
            { value: "lt", label: "<" },
            { value: "between", label: "Between" },
          ]}
        >
          <SelectTrigger size="sm" className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="eq">=</SelectItem>
            <SelectItem value="gt">&gt;</SelectItem>
            <SelectItem value="lt">&lt;</SelectItem>
            <SelectItem value="between">Between</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={filterValue.value ?? ""}
          onChange={(event) =>
            onChange({
              ...filterValue,
              value: event.target.value === "" ? undefined : Number(event.target.value),
            })
          }
        />
        {filterValue.operator === "between" && (
          <Input
            type="number"
            placeholder="and"
            value={filterValue.value2 ?? ""}
            onChange={(event) =>
              onChange({
                ...filterValue,
                value2:
                  event.target.value === "" ? undefined : Number(event.target.value),
              })
            }
          />
        )}
      </div>
    )
  }

  if (variant === "date") {
    const filterValue = (value as DateFilterValue) ?? { operator: "is" }
    return (
      <div className="flex flex-1 gap-1">
        <Select
          value={filterValue.operator}
          onValueChange={(operator) => operator && onChange({ ...filterValue, operator })}
          items={[
            { value: "is", label: "Is" },
            { value: "before", label: "Before" },
            { value: "after", label: "After" },
            { value: "between", label: "Between" },
          ]}
        >
          <SelectTrigger size="sm" className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="is">Is</SelectItem>
            <SelectItem value="before">Before</SelectItem>
            <SelectItem value="after">After</SelectItem>
            <SelectItem value="between">Between</SelectItem>
          </SelectContent>
        </Select>
        <DataTableDatePicker
          value={filterValue.value}
          onChange={(iso) => onChange({ ...filterValue, value: iso })}
        />
        {filterValue.operator === "between" && (
          <DataTableDatePicker
            value={filterValue.value2}
            onChange={(iso) => onChange({ ...filterValue, value2: iso })}
          />
        )}
      </div>
    )
  }

  const filterValue = (value as TextFilterValue) ?? { operator: "contains" }
  return (
    <Input
      placeholder="Contains..."
      value={filterValue.value ?? ""}
      onChange={(event) => onChange({ operator: "contains", value: event.target.value })}
      className="flex-1"
    />
  )
}
