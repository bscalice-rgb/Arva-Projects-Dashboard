import Link from "next/link";
import { Sprout } from "lucide-react";
import { getSeasons, getSelectedSeason } from "@/lib/season";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { SeasonSwitcher } from "@/components/shell/season-switcher";
import { SignOutButton } from "@/components/shell/sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [seasons, selected] = await Promise.all([
    getSeasons(),
    getSelectedSeason(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
          <div className="flex h-14 items-center gap-2 border-b px-5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sprout className="h-4 w-4" />
            </div>
            <span className="font-semibold">Arva Projects</span>
          </div>
          <SidebarNav />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur md:px-6">
            <Link href="/" className="flex items-center gap-2 md:hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <Sprout className="h-4 w-4" />
              </div>
              <span className="font-semibold">Arva</span>
            </Link>
            <div className="hidden text-sm text-muted-foreground md:block">
              Scope-3 program management
            </div>
            <div className="flex items-center gap-3">
              <SeasonSwitcher
                seasons={seasons}
                selectedId={selected?.id ?? null}
              />
              <SignOutButton />
            </div>
          </header>

          {/* Mobile nav */}
          <div className="border-b bg-card md:hidden">
            <SidebarNav />
          </div>

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
