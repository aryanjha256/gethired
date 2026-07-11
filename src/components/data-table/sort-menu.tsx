"use client"

import type { Table as ReactTableInstance } from "@tanstack/react-table"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete02Icon, SortingIcon } from "@hugeicons/core-free-icons"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { DataTableDragHandle } from "./drag-handle"
import { getColumnLabel, useDragReorder } from "./utils"

export function DataTableSortMenu<TData>({
  table,
}: {
  table: ReactTableInstance<TData>
}) {
  const sorting = table.getState().sorting
  const sortableColumns = table.getAllLeafColumns().filter((column) => column.getCanSort())
  const { dragHandleProps, dropZoneProps } = useDragReorder(sorting, (next) =>
    table.setSorting(next)
  )

  function addSort() {
    const used = new Set(sorting.map((sort) => sort.id))
    const next = sortableColumns.find((column) => !used.has(column.id))
    if (!next) return
    table.setSorting((old) => [...old, { id: next.id, desc: false }])
  }

  function updateSort(index: number, patch: Partial<{ id: string; desc: boolean }>) {
    table.setSorting((old) =>
      old.map((sort, i) => (i === index ? { ...sort, ...patch } : sort))
    )
  }

  function removeSort(index: number) {
    table.setSorting((old) => old.filter((_, i) => i !== index))
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <HugeiconsIcon icon={SortingIcon} strokeWidth={2} />
        Sort
        {sorting.length > 0 && <Badge variant="secondary">{sorting.length}</Badge>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto min-w-80">
        <p className="text-xs font-medium text-muted-foreground">Sort by</p>
        <div className="flex flex-col gap-2">
          {sorting.length === 0 && (
            <p className="text-sm text-muted-foreground">No sorting applied</p>
          )}
          {sorting.map((sort, index) => (
            <div key={sort.id} className="flex items-center gap-2" {...dropZoneProps(index)}>
              <DataTableDragHandle {...dragHandleProps(index)} />
              <Select
                value={sort.id}
                onValueChange={(value) => value && updateSort(index, { id: value })}
                items={sortableColumns.map((column) => ({
                  value: column.id,
                  label: getColumnLabel(column),
                }))}
              >
                <SelectTrigger size="sm" className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortableColumns.map((column) => (
                    <SelectItem
                      key={column.id}
                      value={column.id}
                      disabled={sorting.some(
                        (s, i) => s.id === column.id && i !== index
                      )}
                    >
                      {getColumnLabel(column)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={sort.desc ? "desc" : "asc"}
                onValueChange={(value) => updateSort(index, { desc: value === "desc" })}
                items={[
                  { value: "asc", label: "Asc" },
                  { value: "desc", label: "Desc" },
                ]}
              >
                <SelectTrigger size="sm" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Asc</SelectItem>
                  <SelectItem value="desc">Desc</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon-sm" onClick={() => removeSort(index)}>
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addSort}
            disabled={sorting.length >= sortableColumns.length}
          >
            Add sort
          </Button>
          {sorting.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => table.setSorting([])}>
              Reset sorting
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
