"use client";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { NavItemProps } from "@/types/types";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavItem({ name, urlEndpoint }: NavItemProps) {
  const pathname = usePathname();

  const isActive = pathname === urlEndpoint;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton isActive={isActive}>
        <Link href={urlEndpoint}>{name}</Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
