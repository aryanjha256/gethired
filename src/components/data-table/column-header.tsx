"use client"

import { type Header, flexRender } from "@tanstack/react-table"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowDown01Icon, ArrowUp01Icon, UnfoldMoreIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function DataTableColumnHeader<TData, TValue>({
  header,
}: {
  header: Header<TData, TValue>
}) {
  if (header.isPlaceholder) return null

  if (!header.column.getCanSort()) {
    return flexRender(header.column.columnDef.header, header.getContext())
  }

  const sorted = header.column.getIsSorted()
  const button = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={header.column.getToggleSortingHandler()}
      className="group/sort -ml-2 h-auto px-2 py-1 font-medium"
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      <HugeiconsIcon
        icon={sorted === "asc" ? ArrowUp01Icon : sorted === "desc" ? ArrowDown01Icon : UnfoldMoreIcon}
        strokeWidth={2}
        className={cn(
          "size-3.5",
          sorted
            ? "text-foreground"
            : "text-muted-foreground/50 opacity-0 transition-opacity group-hover/sort:opacity-100"
        )}
      />
    </Button>
  )

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>
        Click to sort · <Kbd>Shift</Kbd> click to sort multiple columns
      </TooltipContent>
    </Tooltip>
  )
}
