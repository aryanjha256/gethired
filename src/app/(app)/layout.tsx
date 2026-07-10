import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AppSidebar variant="floating" />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-end gap-2 border-b px-4">
          <UserMenu />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
