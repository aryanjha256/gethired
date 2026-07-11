"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { updateSenderSettings } from "./actions";

interface SenderIdentityFormValues {
  senderName: string;
  signature: string;
  retryCooldownDays: number;
}

export function SenderIdentityForm({
  defaultValues,
}: {
  defaultValues: SenderIdentityFormValues;
}) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SenderIdentityFormValues>({ defaultValues });

  async function onSubmit(values: SenderIdentityFormValues) {
    await updateSenderSettings(values);
    toast.success("Sender identity saved");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-md flex-col gap-4">
      <Field>
        <FieldContent>
          <FieldLabel htmlFor="sender-name">Your name</FieldLabel>
          <Input id="sender-name" {...register("senderName")} />
          <FieldDescription>Used by the {"{{myName}}"} template variable.</FieldDescription>
        </FieldContent>
      </Field>
      <Field>
        <FieldContent>
          <FieldLabel htmlFor="sender-signature">Signature</FieldLabel>
          <Textarea id="sender-signature" rows={4} {...register("signature")} />
          <FieldDescription>Used by the {"{{signature}}"} template variable.</FieldDescription>
        </FieldContent>
      </Field>
      <Field>
        <FieldContent>
          <FieldLabel htmlFor="retry-cooldown-days">Retry cooldown (days)</FieldLabel>
          <Input
            id="retry-cooldown-days"
            type="number"
            min={0}
            {...register("retryCooldownDays", { valueAsNumber: true, min: 0 })}
          />
          <FieldDescription>
            After a contact is marked &quot;No Opening,&quot; how many days before that
            company&apos;s contacts become eligible for outreach again.
          </FieldDescription>
        </FieldContent>
      </Field>
      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
