"use client";

import type { Template } from "@/db/schema";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type TemplateOption = Pick<Template, "id" | "name" | "subject" | "body">;

export function TemplatePicker({
  templates,
  value,
  onChange,
}: {
  templates: TemplateOption[];
  value: string;
  onChange: (templateId: string, template?: TemplateOption) => void;
}) {
  return (
    <Field>
      <FieldContent>
        <FieldLabel>Template</FieldLabel>
        <Select
          value={value}
          onValueChange={(next) => {
            if (!next) return;
            onChange(
              next,
              templates.find((template) => template.id === next),
            );
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldDescription>
          Variables like {"{{firstName}}"} are filled in per recipient when you send.
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}
