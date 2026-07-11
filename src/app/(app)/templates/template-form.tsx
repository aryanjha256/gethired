"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import type { Template } from "@/db/schema";
import {
  renderTemplate,
  SAMPLE_TEMPLATE_CONTEXT,
  TEMPLATE_TYPES,
  TEMPLATE_VARIABLES,
} from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { createTemplate, updateTemplate } from "./actions";

interface TemplateFormValues {
  name: string;
  subject: string;
  body: string;
}

export function TemplateForm({
  mode,
  template,
}: {
  mode: "create" | "edit";
  template?: Template;
}) {
  const [type, setType] = useState(template?.type ?? "custom");
  const [lastFocused, setLastFocused] = useState<"subject" | "body">("body");

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormValues>({
    defaultValues: {
      name: template?.name ?? "",
      subject: template?.subject ?? "",
      body: template?.body ?? "",
    },
  });

  const subject = watch("subject");
  const body = watch("body");

  const preview = useMemo(
    () => ({
      subject: renderTemplate(subject, SAMPLE_TEMPLATE_CONTEXT),
      body: renderTemplate(body, SAMPLE_TEMPLATE_CONTEXT),
    }),
    [subject, body],
  );

  function insertVariable(key: string) {
    setValue(lastFocused, `${getValues(lastFocused)}{{${key}}}`);
  }

  async function onSubmit(values: TemplateFormValues) {
    if (mode === "create") {
      await createTemplate({ ...values, type });
    } else if (template) {
      await updateTemplate(template.id, { ...values, type });
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="template-name">Name</FieldLabel>
            <Input
              id="template-name"
              {...register("name", { required: "Name is required" })}
            />
            <FieldError errors={[errors.name]} />
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="template-type">Type</FieldLabel>
            <Select value={type} onValueChange={(value) => value && setType(value)}>
              <SelectTrigger id="template-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="template-subject">Subject</FieldLabel>
            <Input
              id="template-subject"
              onFocus={() => setLastFocused("subject")}
              {...register("subject", { required: "Subject is required" })}
            />
            <FieldError errors={[errors.subject]} />
          </FieldContent>
        </Field>
        <Field>
          <FieldContent>
            <FieldLabel htmlFor="template-body">Body</FieldLabel>
            <Textarea
              id="template-body"
              rows={10}
              onFocus={() => setLastFocused("body")}
              {...register("body", { required: "Message is required" })}
            />
            <FieldError errors={[errors.body]} />
          </FieldContent>
        </Field>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATE_VARIABLES.map((variable) => (
            <Button
              key={variable.key}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => insertVariable(variable.key)}
            >
              {variable.label}
            </Button>
          ))}
        </div>
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Create template"
                : "Save changes"}
          </Button>
        </div>
      </form>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            Preview against a sample contact
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <p className="font-medium">{preview.subject || "(no subject)"}</p>
          <p className="whitespace-pre-wrap text-muted-foreground">
            {preview.body || "(no message)"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
