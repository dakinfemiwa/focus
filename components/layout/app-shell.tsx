"use client";

import { buttonVariants } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppShellProps } from "@/types/types";
import { useAuth } from "@clerk/nextjs";
import { useConvexAuth } from "convex/react";
import { NavItem } from "./nav-item";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: AppShellProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const isReady =
    isLoaded &&
    (isSignedIn
      ? !isConvexAuthLoading && isAuthenticated
      : !isConvexAuthLoading);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <NavItem name="Dashboard" urlEndpoint="/" />
          <NavItem name="Calendar" urlEndpoint="/calendar" />
        </Sidebar>

        <main className="flex-1">
          {isReady && isSignedIn ? children : null}

          {isReady && !isSignedIn ? (
            <div className="flex min-h-screen items-center justify-center p-6">
              <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
                <h1 className="text-2xl font-semibold">Sign in to continue</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your goals and tasks are private to your account.
                </p>
                <a
                  href="/sign-in"
                  className={`${buttonVariants({ variant: "default" })} mt-6`}
                >
                  Continue to sign in
                </a>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </SidebarProvider>
  );
}
