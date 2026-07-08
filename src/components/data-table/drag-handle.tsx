"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { GripVerticalIcon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"

export function DataTableDragHandle({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-label="Reorder"
      className={cn(
        "flex shrink-0 cursor-grab items-center text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing",
        className
      )}
      {...props}
    >
      <HugeiconsIcon icon={GripVerticalIcon} strokeWidth={2} className="size-4" />
    </span>
  )
}
