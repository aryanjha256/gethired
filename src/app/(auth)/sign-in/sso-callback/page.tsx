"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

import { Spinner } from "@/components/ui/spinner";

export default function SsoCallbackPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Spinner className="size-6 text-muted-foreground" />
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
