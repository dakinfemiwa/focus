import { Button } from "@/components/ui/button";
import {
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    Sidebar as SidebarPrimitive,
} from "@/components/ui/sidebar";
import { SidebarProps } from "@/types/types";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export function Sidebar({ children }: SidebarProps) {
  return (
    <SidebarPrimitive>
      <SidebarHeader>ORGANISE</SidebarHeader>

      <SidebarContent>{children}</SidebarContent>

      <SidebarFooter className="flex-row items-center justify-between">
        <span className="text-sm text-muted-foreground">Settings</span>

        <Show when="signed-out">
          <div className="flex items-center gap-1">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm">Sign up</Button>
            </SignUpButton>
          </div>
        </Show>

        <Show when="signed-in">
          <UserButton />
        </Show>
      </SidebarFooter>
    </SidebarPrimitive>
  );
}
