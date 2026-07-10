import { eq } from "drizzle-orm";

import { db } from "@/db";
import { appSettings } from "@/db/schema";

import { SenderIdentityForm } from "./sender-identity-form";

export default async function SenderIdentityPage() {
  const [settings] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, "singleton"));

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-lg font-medium tracking-tight">Sender Identity</h1>
        <p className="text-sm text-muted-foreground">
          Your name and signature, used to fill in template variables like{" "}
          {"{{myName}}"} and {"{{signature}}"}.
        </p>
      </div>
      <SenderIdentityForm
        defaultValues={{
          senderName: settings?.senderName ?? "",
          signature: settings?.signature ?? "",
        }}
      />
    </div>
  );
}
