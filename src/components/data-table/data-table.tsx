"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { DataTableColumnHeader } from "./column-header"
import { dataTableFilterFns, filterFnForVariant } from "./filter-fns"
import { DataTableFilterMenu } from "./filter-menu"
import { DataTablePagination } from "./pagination"
import { createSelectColumn } from "./select-column"
import { DataTableSortMenu } from "./sort-menu"
import { DataTableViewMenu } from "./view-menu"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  enableRowSelection?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  enableRowSelection = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const resolvedColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    const mapped = columns.map((column): ColumnDef<TData, TValue> => {
      const variant = column.meta?.filterVariant
      if (!variant) return { ...column, enableColumnFilter: false }
      if (column.filterFn) return column
      return { ...column, filterFn: filterFnForVariant(variant) }
    })
    return enableRowSelection
      ? [createSelectColumn<TData>() as ColumnDef<TData, TValue>, ...mapped]
      : mapped
  }, [columns, enableRowSelection])

  const table = useReactTable({
    data,
    columns: resolvedColumns,
    filterFns: dataTableFilterFns,
    enableRowSelection,
    state: { sorting, columnFilters, columnVisibility, rowSelection, pagination },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const visibleColumnCount = table.getVisibleLeafColumns().length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <DataTableSortMenu table={table} />
          <DataTableFilterMenu table={table} setColumnFilters={setColumnFilters} />
        </div>
        <DataTableViewMenu table={table} />
      </div>
      <div className="rounded-2xl border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    <DataTableColumnHeader header={header} />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} showSelectedCount={enableRowSelection} />
    </div>
  )
}
