"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Building02Icon,
  DashboardSquare01Icon,
  FileUploadIcon,
  MailSend01Icon,
  NoteEditIcon,
  Settings01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import Image from "next/image";

const navMain = [
  { title: "Dashboard", url: "/", icon: DashboardSquare01Icon },
  { title: "Contacts", url: "/contacts", icon: UserGroupIcon },
  { title: "Companies", url: "/companies", icon: Building02Icon },
  { title: "Templates", url: "/templates", icon: NoteEditIcon },
  { title: "Import", url: "/import", icon: FileUploadIcon },
  { title: "Test Email", url: "/test-email", icon: MailSend01Icon },
];

const navFooter = [
  { title: "Settings", url: "/settings", icon: Settings01Icon },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuButton
            className="pl-2 mt-2 mb-4"
            render={<Link href="/" />}
          >
            <Image
              src="/favicon.svg"
              alt="GetHired Logo"
              width={24}
              height={24}
            />
            <span>GetHired</span>
          </SidebarMenuButton>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link href={item.url} />}
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {navFooter.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                render={<Link href={item.url} />}
                isActive={pathname === item.url}
                tooltip={item.title}
              >
                <HugeiconsIcon icon={item.icon} strokeWidth={2} />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
