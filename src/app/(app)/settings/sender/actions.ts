"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { appSettings } from "@/db/schema";

export async function updateSenderSettings(values: {
  senderName: string;
  signature: string;
  retryCooldownDays: number;
}) {
  await db
    .insert(appSettings)
    .values({ id: "singleton", ...values })
    .onConflictDoUpdate({ target: appSettings.id, set: values });

  revalidatePath("/settings/sender");
}
