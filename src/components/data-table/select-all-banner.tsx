"use client"

import * as React from "react"
import type { RowSelectionState, Table as ReactTableInstance } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"

// Gmail/Notion-style prompt: the header checkbox only selects the current
// page. Once a full page is selected, this offers a one-click way to extend
// that to every row matching the current filters, instead of paging through
// and re-checking the header box one page at a time.
export function DataTableSelectAllBanner<TData>({
  table,
  setRowSelection,
}: {
  table: ReactTableInstance<TData>
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>
}) {
  const pageRowCount = table.getRowModel().rows.length
  const filteredRowCount = table.getFilteredRowModel().rows.length
  const selectedRowCount = table.getFilteredSelectedRowModel().rows.length

  const allFilteredSelected = filteredRowCount > 0 && selectedRowCount === filteredRowCount
  const showSelectAllPrompt =
    !allFilteredSelected &&
    pageRowCount > 0 &&
    table.getIsAllPageRowsSelected() &&
    filteredRowCount > pageRowCount
  const showClearPrompt = allFilteredSelected && filteredRowCount > pageRowCount

  if (!showSelectAllPrompt && !showClearPrompt) return null

  function selectAllFiltered() {
    const next: RowSelectionState = {}
    for (const row of table.getFilteredRowModel().rows) {
      next[row.id] = true
    }
    setRowSelection(next)
  }

  function clearSelection() {
    setRowSelection({})
  }

  return (
    <div className="flex items-center justify-center gap-1.5 rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
      {showClearPrompt ? (
        <>
          <span>All {filteredRowCount} rows are selected.</span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={clearSelection}
          >
            Clear selection
          </Button>
        </>
      ) : (
        <>
          <span>
            All {pageRowCount} row{pageRowCount === 1 ? "" : "s"} on this page are selected.
          </span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0"
            onClick={selectAllFiltered}
          >
            Select all {filteredRowCount} rows
          </Button>
        </>
      )}
    </div>
  )
}
