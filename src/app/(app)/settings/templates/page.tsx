import Link from "next/link";
import { desc } from "drizzle-orm";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, PencilEdit01Icon } from "@hugeicons/core-free-icons";

import { db } from "@/db";
import { templates } from "@/db/schema";
import { templateTypeLabel } from "@/lib/templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

import { DeleteTemplateButton } from "./delete-template-button";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const rows = await db.select().from(templates).orderBy(desc(templates.createdAt));

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-lg font-medium tracking-tight">Templates</h1>
          <p className="text-sm text-muted-foreground">
            Reusable email templates with variables like {"{{firstName}}"} that
            get filled in per recipient when you send.
          </p>
        </div>
        <Button render={<Link href="/settings/templates/new" />}>
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          New Template
        </Button>
      </div>

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No templates yet</EmptyTitle>
            <EmptyDescription>
              Create one to reuse across your outreach instead of writing
              subject/body by hand every time.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/settings/templates/new" />}>
              New Template
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((template) => (
            <Card key={template.id}>
              <CardContent className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{template.name}</p>
                    <Badge variant="secondary">{templateTypeLabel(template.type)}</Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {template.subject}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    render={<Link href={`/settings/templates/${template.id}/edit`} />}
                  >
                    <HugeiconsIcon icon={PencilEdit01Icon} strokeWidth={2} />
                  </Button>
                  <DeleteTemplateButton id={template.id} name={template.name} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
