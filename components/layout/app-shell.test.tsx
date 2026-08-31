import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const clerkState = { isLoaded: true, isSignedIn: false };

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => ({
    isLoaded: clerkState.isLoaded,
    isSignedIn: clerkState.isSignedIn,
  }),
  Show: ({ when, children }: { when: string; children: React.ReactNode }) =>
    when === "signed-out" && !clerkState.isSignedIn ? (
      <>{children}</>
    ) : when === "signed-in" && clerkState.isSignedIn ? (
      <>{children}</>
    ) : null,
  SignInButton: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SignUpButton: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  UserButton: () => <div>User</div>,
}));

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({
    isLoading: false,
    isAuthenticated: false,
  }),
}));

import { AppShell } from "./app-shell";

describe("AppShell", () => {
  beforeEach(() => {
    clerkState.isLoaded = true;
    clerkState.isSignedIn = false;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  });

  test("shows a sign-in prompt and hides dashboard content while signed out", () => {
    render(
      <AppShell>
        <div>Dashboard content</div>
      </AppShell>,
    );

    expect(screen.getByText(/sign in to continue/i)).toBeInTheDocument();
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });
});
