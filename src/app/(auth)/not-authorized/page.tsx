import { HugeiconsIcon } from "@hugeicons/react";
import { UserBlock02Icon } from "@hugeicons/core-free-icons";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { SignOutButton } from "./sign-out-button";

export default function NotAuthorizedPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={UserBlock02Icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>Access restricted</EmptyTitle>
          <EmptyDescription>
            This app is limited to a single account, and yours isn&apos;t it.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <SignOutButton />
        </EmptyContent>
      </Empty>
    </div>
  );
}
