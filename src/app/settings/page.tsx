import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, Mail01Icon } from "@hugeicons/core-free-icons";

import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-lg font-medium tracking-tight">Settings</h1>
      </div>
      <Link href="/settings/test-email">
        <Card className="transition-colors hover:bg-muted/50">
          <CardContent className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <HugeiconsIcon
                icon={Mail01Icon}
                strokeWidth={2}
                className="size-5 text-muted-foreground"
              />
              <div>
                <p className="text-sm font-medium">Test Email</p>
                <p className="text-sm text-muted-foreground">
                  Send a one-off email to any address to verify SMTP is configured
                  correctly.
                </p>
              </div>
            </div>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="size-4 shrink-0 text-muted-foreground"
            />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
