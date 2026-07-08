import * as React from "react"
import type { Column } from "@tanstack/react-table"

export function getColumnLabel<TData, TValue>(column: Column<TData, TValue>) {
  const header = column.columnDef.header
  return typeof header === "string" ? header : column.id
}

export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to) return list
  const copy = [...list]
  const [moved] = copy.splice(from, 1)
  copy.splice(to, 0, moved)
  return copy
}

// Native HTML5 drag-and-drop (no extra dependency) for reordering a list of
// criteria rows (sort rules, filter rules). The handle is the draggable
// element; the row itself is the drop zone.
export function useDragReorder<T>(items: T[], onReorder: (next: T[]) => void) {
  const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null)

  function dragHandleProps(index: number) {
    return {
      draggable: true,
      onDragStart: () => setDraggedIndex(index),
      onDragEnd: () => setDraggedIndex(null),
    }
  }

  function dropZoneProps(index: number) {
    return {
      onDragOver: (event: React.DragEvent) => event.preventDefault(),
      onDrop: () => {
        if (draggedIndex !== null && draggedIndex !== index) {
          onReorder(reorder(items, draggedIndex, index))
        }
        setDraggedIndex(null)
      },
    }
  }

  return { dragHandleProps, dropZoneProps }
}

export function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}
