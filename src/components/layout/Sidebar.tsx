"use client";

import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { useAuthContext } from "@/providers/auth-provider";
import { useSidebar } from "@/providers/sidebar-provider";
import {
  Calendar,
  GitBranch,
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
  adminOnly?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const params = useParams();
  const envId = params?.envId as string | undefined;
  const { profile, signOut } = useAuthContext();
  const { isOpen, close } = useSidebar();

  const isAdmin = pathname.startsWith("/admin");

  const navItems: NavItem[] = envId
    ? [
        { label: "Tableau de bord", href: `/${envId}`,            icon: LayoutDashboard },
        { label: "Arbre familial",  href: `/${envId}/tree`,       icon: GitBranch },
        { label: "Personnes",       href: `/${envId}/people`,     icon: Users },
        { label: "Lieux",           href: `/${envId}/places`,     icon: MapPin },
        { label: "Événements",      href: `/${envId}/events`,     icon: Calendar },
        { label: "Médias",          href: `/${envId}/media`,      icon: Image },
        { label: "Paramètres",      href: `/${envId}/settings`,   icon: Settings },
      ]
    : [
        { label: "Administration",  href: "/admin",               icon: Shield },
      ];

  function isActive(href: string) {
    if (href === `/${envId}`) return pathname === href;
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-heritage-dark text-heritage-cream w-[260px]">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-heritage-cream">
            Heritage
          </h1>
          {profile?.role !== "super_admin" && (
            <p className="text-xs text-heritage-sand mt-0.5 truncate max-w-[160px]">
              Espace famille
            </p>
          )}
        </div>
        {/* Bouton fermer sur mobile */}
        <button
          onClick={close}
          className="lg:hidden rounded-lg p-1.5 text-heritage-sand hover:text-heritage-cream hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {profile?.role === "super_admin" && !isAdmin && (
          <Link
            href="/admin"
            onClick={close}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm
              text-heritage-sand hover:bg-white/10 hover:text-heritage-cream transition-colors mb-2"
          >
            <Shield className="h-4 w-4" />
            Super Admin
          </Link>
        )}
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
      </nav>

      {/* Pied : utilisateur + déconnexion */}
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
      {/* Desktop : sidebar fixe */}
      <aside className="hidden lg:flex shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile : drawer avec overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-heritage-dark/60"
            onClick={close}
          />
          {/* Drawer */}
          <aside className="relative flex h-full">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
