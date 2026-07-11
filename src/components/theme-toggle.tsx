"use client";

import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CustomizeIcon,
  Moon02Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun03Icon },
  { value: "dark", label: "Dark", icon: Moon02Icon },
  { value: "system", label: "System", icon: CustomizeIcon },
] as const;

export function ThemeToggle() {
  // Matches the existing `useTheme()` convention in src/components/ui/sonner.tsx
  // (a plain default, no local mounted-guard effect) rather than introducing a
  // fresh "setState in an effect" pattern already flagged elsewhere in this repo.
  const { theme = "light", setTheme } = useTheme();
  const current =
    THEME_OPTIONS.find((option) => option.value === theme) ?? THEME_OPTIONS[0];

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger render={<SidebarMenuButton tooltip="Theme" />}>
          <HugeiconsIcon icon={current.icon} strokeWidth={2} />
          <span>Theme</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right">
          {THEME_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
            >
              <HugeiconsIcon icon={option.icon} strokeWidth={2} />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
