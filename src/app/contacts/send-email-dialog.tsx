"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { ContactRow } from "./contacts-table";
import { sendContactEmails } from "./actions";

interface SendEmailFormValues {
  subject: string;
  body: string;
}

export function SendEmailDialog({
  open,
  onOpenChange,
  contacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ContactRow[];
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SendEmailFormValues>();

  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  async function onSubmit(values: SendEmailFormValues) {
    const result = await sendContactEmails(
      contacts.map((contact) => contact.id),
      values.subject,
      values.body,
    );

    if (result.sent > 0) {
      toast.success(
        `Sent to ${result.sent} contact${result.sent === 1 ? "" : "s"}` +
          (result.failed > 0 ? `, ${result.failed} failed` : ""),
      );
      onOpenChange(false);
    } else {
      toast.error("Nothing was sent — check your SMTP configuration and try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send email</DialogTitle>
          <DialogDescription>
            {contacts.length} recipient{contacts.length === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="send-email-subject">Subject</FieldLabel>
              <Input
                id="send-email-subject"
                {...register("subject", { required: "Subject is required" })}
              />
              <FieldError errors={[errors.subject]} />
            </FieldContent>
          </Field>
          <Field>
            <FieldContent>
              <FieldLabel htmlFor="send-email-body">Message</FieldLabel>
              <Textarea
                id="send-email-body"
                rows={8}
                {...register("body", { required: "Message is required" })}
              />
              <FieldError errors={[errors.body]} />
            </FieldContent>
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting || contacts.length === 0}>
              {isSubmitting
                ? "Sending..."
                : `Send${contacts.length ? ` (${contacts.length})` : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
