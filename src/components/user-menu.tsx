"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout03Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline">{user.fullName}</Button>}
      />
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
            {email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut(undefined, { redirectUrl: "/sign-in" })}
        >
          <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
