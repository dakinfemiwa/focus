import { SidebarProvider } from "@/components/ui/sidebar";
import { AppShellProps } from "@/types/types";
import { NavItem } from "./nav-item";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: AppShellProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <NavItem name="Dashboard" urlEndpoint="/" />
          <NavItem name="Calendar" urlEndpoint="/calendar" />
        </Sidebar>

        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  );
}
