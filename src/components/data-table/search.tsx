"use client"

import type { Table as ReactTableInstance } from "@tanstack/react-table"
import { HugeiconsIcon } from "@hugeicons/react"
import { Search01Icon } from "@hugeicons/core-free-icons"

import { Input } from "@/components/ui/input"

export function DataTableSearch<TData>({
  table,
  placeholder = "Search...",
}: {
  table: ReactTableInstance<TData>
  placeholder?: string
}) {
  const value = (table.getState().globalFilter as string) ?? ""

  return (
    <div className="relative w-full max-w-56">
      <HugeiconsIcon
        icon={Search01Icon}
        strokeWidth={2}
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        value={value}
        onChange={(event) => table.setGlobalFilter(event.target.value)}
        placeholder={placeholder}
        className="pl-8"
      />
    </div>
  )
}
