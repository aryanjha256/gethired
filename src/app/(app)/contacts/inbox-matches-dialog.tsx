"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { contactStatusLabel } from "@/lib/contacts";

import { applyInboxMatches, type InboxMatch } from "./actions";

export function InboxMatchesDialog({
  open,
  onOpenChange,
  matches,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matches: InboxMatch[];
  onApplied: (result: { repliedCount: number; bouncedCount: number }) => void;
}) {
  const [applying, setApplying] = useState(false);

  async function handleApply() {
    setApplying(true);
    try {
      const result = await applyInboxMatches(matches);
      onApplied(result);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not apply changes");
    } finally {
      setApplying(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100vh-4rem)] flex-col">
        <DialogHeader>
          <DialogTitle>Inbox matches</DialogTitle>
          <DialogDescription>
            {matches.length} contact{matches.length === 1 ? "" : "s"} matched — review before
            applying.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 -mx-6 px-6">
          <div className="flex flex-col gap-2">
            {matches.map((match) => (
              <div key={match.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{match.name ?? match.email}</span>
                <Badge
                  variant={match.status === "bounced" ? "destructive" : "secondary"}
                  className="shrink-0"
                >
                  {contactStatusLabel(match.status)}
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applying}>
            {applying ? "Applying..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
