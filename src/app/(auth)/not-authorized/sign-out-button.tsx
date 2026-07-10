"use client";

import { useClerk } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { signOut } = useClerk();

  return (
    <Button
      variant="outline"
      onClick={() => signOut(undefined, { redirectUrl: "/sign-in" })}
    >
      Sign out
    </Button>
  );
}
