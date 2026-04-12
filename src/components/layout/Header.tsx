"use client";

import { useSidebar } from "@/providers/sidebar-provider";
import { Bell, ChevronRight, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTreeStore } from "@/stores/treeStore";
import { Omnisearch } from "./Omnisearch";

const routeLabels: Record<string, string> = {
  tree:     "Arbre familial",
  people:   "Personnes",
  places:   "Lieux",
  events:   "Événements",
  media:    "Médias",
  settings: "Paramètres",
  admin:    "Super Admin",
  // sub-pages
  new:      "Nouveau",
};

export function Header() {
  const pathname = usePathname();
  const params = useParams();
  const envId = params?.envId as string | undefined;
  const { toggle } = useSidebar();
  const { setOmnisearchOpen, omnisearchOpen } = useTreeStore();

  // ── Breadcrumb ─────────────────────────────────────────────────────────
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  if (segments[0] === "admin") {
    breadcrumbs.push({ label: "Super Admin", href: "/admin" });
  } else if (envId) {
    breadcrumbs.push({ label: "Tableau de bord", href: `/${envId}` });
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && lastSegment !== envId && routeLabels[lastSegment]) {
      breadcrumbs.push({
        label: routeLabels[lastSegment],
        href: `/${envId}/${lastSegment}`,
      });
    }
  }

  // ── Mac vs Windows ⌘K badge ────────────────────────────────────────────
  const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
  const shortcutLabel = isMac ? "⌘K" : "Ctrl K";

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4
        border-b border-heritage-sand/30 bg-heritage-white/90 backdrop-blur-sm px-4 lg:px-6">

        {/* Hamburger (mobile) */}
        <button
          onClick={toggle}
          className="lg:hidden rounded-lg p-1.5 text-heritage-brown
            hover:bg-heritage-beige hover:text-heritage-dark transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm flex-1 min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1 min-w-0">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-heritage-sand shrink-0" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-medium text-heritage-dark truncate">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-heritage-brown hover:text-heritage-dark transition-colors truncate"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Omnisearch trigger */}
          <button
            onClick={() => setOmnisearchOpen(true)}
            className="hidden sm:flex items-center gap-2 h-8 rounded-lg
              border border-heritage-sand bg-heritage-cream px-3 text-sm
              text-heritage-brown hover:border-heritage-forest/40 transition-colors
              group"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline text-heritage-brown/70">Rechercher…</span>
            <kbd className="hidden lg:flex items-center rounded border border-heritage-sand/70
              bg-heritage-white px-1.5 py-0.5 text-[10px] font-mono text-heritage-brown/60
              group-hover:border-heritage-forest/30 transition-colors">
              {shortcutLabel}
            </kbd>
          </button>

          {/* Mobile search button */}
          <button
            onClick={() => setOmnisearchOpen(true)}
            className="sm:hidden rounded-lg p-1.5 text-heritage-brown
              hover:bg-heritage-beige hover:text-heritage-dark transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>

          {/* Notifications */}
          <button
            className="relative rounded-lg p-1.5 text-heritage-brown
              hover:bg-heritage-beige hover:text-heritage-dark transition-colors"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Omnisearch palette (portal) */}
      <Omnisearch envId={envId ?? null} />
    </>
  );
}
