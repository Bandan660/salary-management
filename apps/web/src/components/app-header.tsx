"use client";

import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Insights" },
  { href: "/employees", label: "Employees" },
];

export function AppHeader() {
  const pathname = usePathname();
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<{ email: string }>("/auth/me") });

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    // Full reload on purpose: drops every cached query (salary data) from memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
        <Link href="/" className="font-semibold tracking-tight">
          ACME Salaries
        </Link>
        <nav className="flex gap-1">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{me.data?.email}</span>
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut /> Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
