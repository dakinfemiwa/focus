import {
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    Sidebar as SidebarPrimitive,
} from "@/components/ui/sidebar";
import { SidebarProps } from "@/types/types";

export function Sidebar({ children }: SidebarProps) {
  return (
    <SidebarPrimitive>
      <SidebarHeader>ORGANISE</SidebarHeader>

      <SidebarContent>{children}</SidebarContent>

      <SidebarFooter>Settings</SidebarFooter>
    </SidebarPrimitive>
  );
}
