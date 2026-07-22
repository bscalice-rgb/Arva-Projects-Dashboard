"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Sprout,
  Users,
  Network,
  Target,
  Factory,
  CalendarRange,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/clients", label: "Clients / Growers", icon: Sprout },
  { href: "/channel-partners", label: "Channel Partners", icon: Users },
  { href: "/org-nodes", label: "Org Nodes", icon: Network },
  { href: "/supply-sheds", label: "Supply Sheds", icon: Target },
  { href: "/mills", label: "Mills / Refineries", icon: Factory },
  { href: "/seasons", label: "Seasons", icon: CalendarRange },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
