import Link from "next/link";
import type { HugeiconsIconProps } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { Card, CardContent } from "@/components/ui/card";

export function SettingsLinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: HugeiconsIconProps["icon"];
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-muted/50">
        <CardContent className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <HugeiconsIcon icon={icon} strokeWidth={2} className="size-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
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
  );
}
