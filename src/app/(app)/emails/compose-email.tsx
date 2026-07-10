"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

import { sendContactEmails } from "@/app/(app)/contacts/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TemplatePicker, type TemplateOption } from "@/components/template-picker";

interface RecipientOption {
  value: string; // contact id
  label: string; // "Name <email> — Company"
}

interface ComposeFormValues {
  subject: string;
  body: string;
}

export function ComposeEmail({
  recipients,
  templates,
}: {
  recipients: { id: string; name: string | null; email: string; companyName: string | null }[];
  templates: TemplateOption[];
}) {
  const options: RecipientOption[] = recipients.map((contact) => ({
    value: contact.id,
    label:
      `${contact.name ?? contact.email} <${contact.email}>` +
      (contact.companyName ? ` — ${contact.companyName}` : ""),
  }));

  const [selected, setSelected] = useState<RecipientOption[]>([]);
  const [templateId, setTemplateId] = useState("none");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ComposeFormValues>();

  function removeRecipient(value: string) {
    setSelected((current) => current.filter((option) => option.value !== value));
  }

  async function onSubmit(values: ComposeFormValues) {
    if (selected.length === 0) {
      toast.error("Add at least one recipient.");
      return;
    }

    const result = await sendContactEmails(
      selected.map((option) => option.value),
      values.subject,
      values.body,
      templateId === "none" ? null : templateId,
    );

    if (result.sent > 0) {
      toast.success(
        `Sent to ${result.sent} contact${result.sent === 1 ? "" : "s"}` +
          (result.failed > 0 ? `, ${result.failed} failed` : ""),
      );
      reset();
      setSelected([]);
      setTemplateId("none");
    } else {
      toast.error("Nothing was sent — check your SMTP configuration and try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-2xl flex-col gap-4">
      <Field>
        <FieldContent>
          <FieldLabel>Recipients</FieldLabel>
          <Combobox
            items={options}
            multiple
            value={selected}
            onValueChange={setSelected}
          >
            <ComboboxInput placeholder="Search contacts..." />
            <ComboboxContent>
              <ComboboxEmpty>No contacts found.</ComboboxEmpty>
              <ComboboxList>
                {(item: RecipientOption) => (
                  <ComboboxItem key={item.value} value={item}>
                    {item.label}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selected.map((option) => (
                <Badge key={option.value} variant="secondary" className="gap-1 pr-1">
                  {option.label}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="size-4"
                    onClick={() => removeRecipient(option.value)}
                  >
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </FieldContent>
      </Field>
      <TemplatePicker
        templates={templates}
        value={templateId}
        onChange={(id, template) => {
          setTemplateId(id);
          if (template) {
            setValue("subject", template.subject);
            setValue("body", template.body);
          }
        }}
      />
      <Field>
        <FieldContent>
          <FieldLabel htmlFor="compose-subject">Subject</FieldLabel>
          <Input
            id="compose-subject"
            {...register("subject", { required: "Subject is required" })}
          />
          <FieldError errors={[errors.subject]} />
        </FieldContent>
      </Field>
      <Field>
        <FieldContent>
          <FieldLabel htmlFor="compose-body">Message</FieldLabel>
          <Textarea
            id="compose-body"
            rows={10}
            {...register("body", { required: "Message is required" })}
          />
          <FieldError errors={[errors.body]} />
        </FieldContent>
      </Field>
      <div>
        <Button type="submit" disabled={isSubmitting || options.length === 0}>
          {isSubmitting
            ? "Sending..."
            : `Send${selected.length ? ` (${selected.length})` : ""}`}
        </Button>
      </div>
    </form>
  );
}
