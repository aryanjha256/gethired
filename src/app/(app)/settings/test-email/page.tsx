import { TestEmailForm } from "./test-email-form";

export default function TestEmailPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-lg font-medium tracking-tight">Test Email</h1>
        <p className="text-sm text-muted-foreground">
          Send a one-off email to any address — useful for checking your SMTP
          configuration before relying on it elsewhere.
        </p>
      </div>
      <TestEmailForm />
    </div>
  );
}
