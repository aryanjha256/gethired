"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { sendTestEmail } from "./actions";

interface TestEmailFormValues {
  to: string;
  subject: string;
  body: string;
}

export function TestEmailForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TestEmailFormValues>({
    defaultValues: {
      subject: "Test email",
      body: "This is a test email to confirm SMTP sending is working.",
    },
  });

  async function onSubmit(values: TestEmailFormValues) {
    const result = await sendTestEmail(values.to, values.subject, values.body);
    if (result.success) {
      toast.success(`Sent to ${values.to}`);
    } else {
      toast.error(`Failed to send: ${result.error}`);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-md flex-col gap-4">
      <Field>
        <FieldContent>
          <FieldLabel htmlFor="test-email-to">To</FieldLabel>
          <Input
            id="test-email-to"
            type="email"
            placeholder="you@example.com"
            {...register("to", { required: "Recipient is required" })}
          />
          <FieldError errors={[errors.to]} />
        </FieldContent>
      </Field>
      <Field>
        <FieldContent>
          <FieldLabel htmlFor="test-email-subject">Subject</FieldLabel>
          <Input
            id="test-email-subject"
            {...register("subject", { required: "Subject is required" })}
          />
          <FieldError errors={[errors.subject]} />
        </FieldContent>
      </Field>
      <Field>
        <FieldContent>
          <FieldLabel htmlFor="test-email-body">Message</FieldLabel>
          <Textarea
            id="test-email-body"
            rows={6}
            {...register("body", { required: "Message is required" })}
          />
          <FieldError errors={[errors.body]} />
        </FieldContent>
      </Field>
      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send test email"}
        </Button>
      </div>
    </form>
  );
}
