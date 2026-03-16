import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";

interface AppShellProps {
  children: ReactNode;
  variant?: "default" | "shopper" | "none";
}

/**
 * Top-level app shell. Provides the green header, page background, bottom nav,
 * and consistent spacing. Supports layout variants for different page types.
 *
 * - "default": Green header + bottom nav + page content
 * - "shopper": No header, no bottom nav (ShopperModePage renders its own)
 * - "none": No header, no bottom nav (standalone pages)
 */
export function AppShell({ children, variant = "default" }: AppShellProps) {
  const showHeader = variant === "default";
  const showBottomNav = variant === "default";

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--fc-bg)" }}
    >
      {showHeader && (
        <header
          className="sticky top-0 z-50"
          style={{ backgroundColor: "var(--fc-primary)" }}
        >
          <div className="mx-auto flex h-14 max-w-md items-center px-4">
            <h1
              className="text-lg font-semibold tracking-tight"
              style={{ color: "var(--fc-text-on-dark)" }}
            >
              FamilyCart
            </h1>
          </div>
        </header>
      )}
      <main className={`mx-auto max-w-md px-4 py-6 ${showBottomNav ? "pb-20" : ""}`}>
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
