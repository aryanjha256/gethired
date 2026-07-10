import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { templates } from "@/db/schema";

import { TemplateForm } from "../../template-form";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [template] = await db.select().from(templates).where(eq(templates.id, id));

  if (!template) notFound();

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-lg font-medium tracking-tight">Edit Template</h1>
      </div>
      <TemplateForm mode="edit" template={template} />
    </div>
  );
}
