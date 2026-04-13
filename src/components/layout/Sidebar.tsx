"use client";

import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthContext } from "@/providers/auth-provider";
import { useSidebar } from "@/providers/sidebar-provider";
import { useEnvironments } from "@/hooks/useEnvironments";
import {
  Calendar,
  GitBranch,
  Globe,
  Image,
  LayoutDashboard,
  LogOut,
  MapPin,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const envId = params?.envId as string | undefined;
  const { profile, signOut } = useAuthContext();
  const { isOpen, close } = useSidebar();
  const isSuperAdmin = profile?.role === "super_admin";

  // Load environments only for super_admin
  const { data: environments = [] } = useEnvironments();

  const isAdminSection = pathname.startsWith("/admin");

  const navItems: NavItem[] = envId
    ? [
        { label: "Tableau de bord", href: `/${envId}`,          icon: LayoutDashboard },
        { label: "Arbre familial",  href: `/${envId}/tree`,     icon: GitBranch },
        { label: "Personnes",       href: `/${envId}/people`,   icon: Users },
        { label: "Lieux",           href: `/${envId}/places`,   icon: MapPin },
        { label: "Événements",      href: `/${envId}/events`,   icon: Calendar },
        { label: "Médias",          href: `/${envId}/media`,    icon: Image },
        { label: "Paramètres",      href: `/${envId}/settings`, icon: Settings },
      ]
    : [];

  function isActive(href: string) {
    if (href === `/${envId}`) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-heritage-dark text-heritage-cream w-[260px]">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-heritage-cream">
            Heritage
          </h1>
          {!isSuperAdmin && (
            <p className="text-xs text-heritage-sand mt-0.5 truncate max-w-[160px]">
              Espace famille
            </p>
          )}
        </div>
        <button
          onClick={close}
          className="lg:hidden rounded-lg p-1.5 text-heritage-sand hover:text-heritage-cream hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">

        {/* Super Admin section */}
        {isSuperAdmin && (
          <>
            {/* Super Admin link */}
            <Link
              href="/admin"
              onClick={close}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors relative
                ${pathname === "/admin"
                  ? "bg-heritage-forest/20 text-heritage-cream font-medium"
                  : "text-heritage-sand hover:bg-white/10 hover:text-heritage-cream"
                }`}
            >
              {pathname === "/admin" && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-heritage-leaf rounded-r-full" />
              )}
              <Shield className="h-4 w-4 shrink-0" />
              Super Admin
            </Link>

            {/* Environments list */}
            {environments.length > 0 && (
              <div className="mt-2">
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-heritage-sand/50">
                  Familles
                </p>
                {environments.map((env) => {
                  const href = `/admin/${env.id}`;
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={env.id}
                      href={href}
                      onClick={close}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative
                        ${active
                          ? "bg-heritage-forest/20 text-heritage-cream font-medium"
                          : "text-heritage-sand hover:bg-white/10 hover:text-heritage-cream"
                        }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-heritage-leaf rounded-r-full" />
                      )}
                      <Globe className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{env.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Separator if we're also in an env */}
            {envId && (
              <div className="my-3 border-t border-white/10" />
            )}
          </>
        )}

        {/* Env-scoped nav */}
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm
                transition-colors relative
                ${active
                  ? "bg-heritage-forest/20 text-heritage-cream font-medium"
                  : "text-heritage-sand hover:bg-white/10 hover:text-heritage-cream"
                }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-heritage-leaf rounded-r-full" />
              )}
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {/* Non-admin, no env */}
        {!isSuperAdmin && !envId && (
          <p className="px-3 py-4 text-sm text-heritage-sand/60 text-center">
            Aucun environnement actif
          </p>
        )}
      </nav>

      {/* Footer : user + logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <Avatar
            firstName={profile?.full_name?.split(" ")[0]}
            lastName={profile?.full_name?.split(" ")[1]}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-heritage-cream truncate">
              {profile?.full_name ?? profile?.email ?? "Utilisateur"}
            </p>
            {profile?.role === "guest" ? (
              <Badge variant="neutral" size="sm" className="mt-0.5">
                Lecture seule
              </Badge>
            ) : (
              <p className="text-xs text-heritage-sand capitalize">
                {profile?.role?.replace("_", " ")}
              </p>
            )}
          </div>
          <button
            onClick={signOut}
            title="Se déconnecter"
            className="rounded-lg p-1.5 text-heritage-sand hover:text-heritage-cream
              hover:bg-white/10 transition-colors shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop : fixed sidebar */}
      <aside className="hidden lg:flex shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile : drawer with overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-heritage-dark/60"
            onClick={close}
          />
          <aside className="relative flex h-full">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
