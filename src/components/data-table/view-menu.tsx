"use client"

import type { Table as ReactTableInstance } from "@tanstack/react-table"
import { HugeiconsIcon } from "@hugeicons/react"
import { ViewIcon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { getColumnLabel } from "./utils"

export function DataTableViewMenu<TData>({
  table,
}: {
  table: ReactTableInstance<TData>
}) {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide())

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" />}>
        <HugeiconsIcon icon={ViewIcon} strokeWidth={2} />
        View
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto min-w-56">
        <p className="text-xs font-medium text-muted-foreground">Toggle columns</p>
        <div className="flex flex-col gap-1">
          {columns.map((column) => (
            <Label
              key={column.id}
              className="cursor-pointer rounded-xl px-2 py-1.5 font-normal hover:bg-muted"
            >
              <Checkbox
                checked={column.getIsVisible()}
                onCheckedChange={(checked) => column.toggleVisibility(checked)}
              />
              {getColumnLabel(column)}
            </Label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
