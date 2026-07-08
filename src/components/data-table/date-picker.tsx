"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { Calendar01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { toISODate } from "./utils"

export function DataTableDatePicker({
  value,
  onChange,
}: {
  value?: string
  onChange: (value: string | undefined) => void
}) {
  const date = value ? new Date(value) : undefined

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="sm" className="justify-start font-normal" />}
      >
        <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} />
        {date ? date.toLocaleDateString() : "Pick date"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selected) => onChange(selected ? toISODate(selected) : undefined)}
        />
      </PopoverContent>
    </Popover>
  )
}
