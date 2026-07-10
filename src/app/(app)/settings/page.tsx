import { Mail01Icon, MessageMultiple01Icon, UserIcon } from "@hugeicons/core-free-icons";

import { SettingsLinkCard } from "./settings-link-card";

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div>
        <h1 className="font-heading text-lg font-medium tracking-tight">Settings</h1>
      </div>
      <SettingsLinkCard
        href="/settings/templates"
        icon={MessageMultiple01Icon}
        title="Templates"
        description="Reusable email templates with variables like {{firstName}}."
      />
      <SettingsLinkCard
        href="/settings/sender"
        icon={UserIcon}
        title="Sender Identity"
        description="Your name and signature, used by template variables."
      />
      <SettingsLinkCard
        href="/settings/test-email"
        icon={Mail01Icon}
        title="Test Email"
        description="Send a one-off email to any address to verify SMTP is configured correctly."
      />
    </div>
  );
}
