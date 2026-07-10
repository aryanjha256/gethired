"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { templates } from "@/db/schema";

interface TemplateInput {
  name: string;
  type: string;
  subject: string;
  body: string;
}

export async function createTemplate(input: TemplateInput) {
  await db.insert(templates).values(input);
  redirect("/settings/templates");
}

export async function updateTemplate(id: string, input: TemplateInput) {
  await db
    .update(templates)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(templates.id, id));
  redirect("/settings/templates");
}

export async function deleteTemplate(id: string) {
  await db.delete(templates).where(eq(templates.id, id));
  revalidatePath("/settings/templates");
}
