"use client";

import React, { memo, useMemo, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { getSidebarLinks, type Section, type OrgTipo } from "@/lib/sidebar-links";
import { LogOut, ChevronRight, Star } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { useUserPermissions } from "@/lib/hooks/use-user-permissions";
import { useSession } from "@/lib/hooks/use-session";
import { useOrgFeatures } from "@/lib/hooks/use-org-features";
import { cn } from "@/lib/utils";
import { SecondaryNav } from "./SecondaryNav";
import { OrgSwitcher } from "./OrgSwitcher";
import { FavoritesQuickAccess } from "./FavoritesQuickAccess";
import { useFavorites, type FavoriteItem } from "@/hooks/use-favorites";
import { useVencimientosCriticosCount } from "@/lib/hooks/use-regulatory";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export const AppSidebar = memo(function AppSidebar() {
  const { loading, isAdmin, canAccess } = useUserPermissions();
  const { data: session } = useSession();
  const { features } = useOrgFeatures();
  const { isMobile, setOpenMobile } = useSidebar();
  const router = useRouter();
  const orgTipo = session?.user?.orgTipo as OrgTipo | undefined;
  const userEmail = session?.user?.email;
  const sidebarLinks = useMemo(() => getSidebarLinks(orgTipo, features, userEmail), [orgTipo, features, userEmail]);
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const showOverlay = !isMobile && (sidebarHovered || selectedSection !== null);

  // Mobile: track open sections in accordion
  const [mobileOpenSections, setMobileOpenSections] = useState<string[]>([]);
  const { toggleFavorite, isFavorite } = useFavorites();
  const { count: vencimientosCount } = useVencimientosCriticosCount();

  // Track if we've shown content at least once - prevents flicker on navigation
  const hasShownContentRef = useRef(false);

  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Once we've loaded once, remember it
  useEffect(() => {
    if (!loading && !hasShownContentRef.current) {
      hasShownContentRef.current = true;
      setIsFirstLoad(false);
    }
  }, [loading]);

  // Módulos ocultos para esta persona (feature flags por miembro).
  // Aplica incluso a admins: el corto-circuito de abajo los respeta.
  const modulosOcultos = useMemo(
    () => new Set<string>(((session?.user as { modulosOcultos?: string[] } | undefined)?.modulosOcultos) ?? []),
    [session?.user]
  );

  // Filter sections based on user permissions
  const filteredSections = useMemo(() => {
    if (isFirstLoad && loading) return [];

    if (isAdmin) {
      // Admin ve todo, salvo los módulos explícitamente ocultados para su persona.
      if (modulosOcultos.size === 0) return sidebarLinks.sections;
      return sidebarLinks.sections
        .map(section => ({
          ...section,
          items: section.items
            .filter(item => !item.permission || !modulosOcultos.has(item.permission))
            .map(item => ({
              ...item,
              subItems: item.subItems?.filter(sub => !sub.permission || !modulosOcultos.has(sub.permission))
            }))
        }))
        .filter(section => section.items.length > 0 || !!section.url);
    }

    // Non-admin: combina permiso del rol + modulos_ocultos por miembro.
    // El módulo se muestra sólo si el rol da acceso Y no está oculto.
    return sidebarLinks.sections
      .map(section => ({
        ...section,
        items: section.items.filter(item =>
          (!item.permission || canAccess(item.permission)) &&
          (!item.permission || !modulosOcultos.has(item.permission))
        ).map(item => ({
          ...item,
          subItems: item.subItems?.filter(sub =>
            (!sub.permission || canAccess(sub.permission)) &&
            (!sub.permission || !modulosOcultos.has(sub.permission))
          )
        }))
      }))
      // Igual que el path de admin: conservar secciones solo-url (sin items),
      // p. ej. Biblioteca. No tienen `permission`, así que son visibles a todos.
      .filter(section => section.items.length > 0 || !!section.url);
  }, [isFirstLoad, loading, isAdmin, canAccess, sidebarLinks, modulosOcultos]);

  const handleSectionClick = React.useCallback((section: Section) => {
    if (section.url) {
      router.push(section.url);
      setSelectedSection(null);
      return;
    }
    setSelectedSection(prev =>
      prev?.title === section.title ? null : section
    );
  }, [router]);

  const toggleMobileSection = (title: string) => {
    setMobileOpenSections(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const handleMobileNavigate = () => {
    setOpenMobile(false);
  };

  const handleMobileToggleFavorite = (e: React.MouseEvent, item: { title: string; url?: string; icon: React.ComponentType<any> }, sectionTitle: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item.url) return;
    const favoriteItem: FavoriteItem = {
      title: item.title,
      url: item.url,
      icon: item.icon.name || (item.icon as any).displayName || 'Circle',
      sectionTitle,
    };
    toggleFavorite(favoriteItem);
  };

  // --- MOBILE SIDEBAR CONTENT ---
  if (isMobile) {
    return (
      <Sidebar
        collapsible="offcanvas"
        className="border-r border-border z-20 bg-sidebar"
      >
        <SidebarHeader className="relative border-b border-border p-3">
          <div className="flex items-center gap-3">
            <OrgSwitcher
              currentOrgId={session?.user?.orgId}
              currentOrgName={session?.user?.orgName}
            />
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {session?.user?.orgName || ""}
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent className="relative bg-transparent overflow-y-auto flex-1 min-h-0 p-2">
          {/* Favoritos */}
          <FavoritesQuickAccess onNavigate={handleMobileNavigate} />

          {isFirstLoad && loading ? (
            <div className="flex flex-col gap-2 p-3">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-11 rounded-xl bg-muted dark:bg-muted animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredSections.map((section) => {
                // Direct link sections — no collapsible, just navigate
                if (section.url) {
                  return (
                    <a
                      key={section.title}
                      href={section.url}
                      onClick={handleMobileNavigate}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                        "hover:bg-accent/10 dark:hover:bg-accent/10",
                        "active:scale-[0.98]"
                      )}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0 bg-muted">
                        <section.icon className="h-4.5 w-4.5 text-primary" />
                      </div>
                      <span className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-gray-200">
                        {section.title}
                      </span>
                    </a>
                  );
                }

                return (
                <Collapsible
                  key={section.title}
                  open={mobileOpenSections.includes(section.title)}
                  onOpenChange={() => toggleMobileSection(section.title)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                        "hover:bg-accent/10 dark:hover:bg-accent/10",
                        "active:scale-[0.98]",
                        mobileOpenSections.includes(section.title) && "bg-accent/5"
                      )}
                    >
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0",
                        mobileOpenSections.includes(section.title)
                          ? "bg-primary"
                          : "bg-muted"
                      )}>
                        <section.icon className={cn(
                          "h-4.5 w-4.5",
                          mobileOpenSections.includes(section.title)
                            ? "text-white"
                            : "text-primary"
                        )} />
                      </div>
                      <span className="flex-1 text-left text-sm font-medium text-gray-800 dark:text-gray-200">
                        {section.title}
                      </span>
                      <ChevronRight className={cn(
                        "h-4 w-4 text-gray-400 transition-transform duration-200",
                        mobileOpenSections.includes(section.title) && "rotate-90"
                      )} />
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="overflow-hidden">
                    <div className="ml-6 mt-1 mb-2 space-y-0.5 border-l-2 border-border/50 pl-3">
                      {section.items.map((item) => {
                        if (item.subItems && item.subItems.length > 0) {
                          return (
                            <Collapsible key={item.title}>
                              <CollapsibleTrigger asChild>
                                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-accent/5 transition-colors">
                                  <item.icon className="h-4 w-4 flex-shrink-0 text-primary/60" />
                                  <span className="flex-1 text-left">{item.title}</span>
                                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="ml-6 space-y-0.5 border-l border-border/30 pl-2">
                                  {item.subItems.map((subItem) => (
                                    <a
                                      key={subItem.url}
                                      href={subItem.url}
                                      onClick={handleMobileNavigate}
                                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:text-foreground hover:bg-accent/5 transition-colors"
                                    >
                                      <subItem.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span>{subItem.title}</span>
                                    </a>
                                  ))}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        }

                        const itemIsFav = item.url ? isFavorite(item.url) : false;
                        return (
                          <div key={item.title} className="relative group/fav">
                            <a
                              href={item.url || "#"}
                              onClick={handleMobileNavigate}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:text-foreground hover:bg-accent/5 transition-colors"
                            >
                              <item.icon className="h-4 w-4 flex-shrink-0 text-primary/60" />
                              <span className="flex-1">{item.title}</span>
                              {item.url === '/dashboard/regulatorio/vencimientos' && vencimientosCount > 0 && (
                                <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 text-[11px] font-bold bg-red-500 text-white shadow-sm shadow-red-500/30">
                                  {vencimientosCount}
                                </span>
                              )}
                              {item.badge && (
                                <span className={cn(
                                  "rounded-full px-2 py-0.5 text-xs font-bold",
                                  item.badge === "live"
                                    ? "bg-green-500 text-white"
                                    : "bg-primary text-primary-foreground"
                                )}>
                                  {item.badge}
                                </span>
                              )}
                            </a>
                            {item.url && (
                              <button
                                onClick={(e) => handleMobileToggleFavorite(e, item, section.title)}
                                className={cn(
                                  "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200",
                                  itemIsFav
                                    ? "text-yellow-500"
                                    : "text-gray-300 dark:text-gray-600 active:text-yellow-500"
                                )}
                              >
                                <Star className={cn("h-3.5 w-3.5", itemIsFav && "fill-current")} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
              })}
            </div>
          )}
        </SidebarContent>

        <SidebarFooter className="relative border-t border-border p-3 bg-transparent">
          <button
            onClick={() => signOutAction()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Cerrar Sesión</span>
          </button>
        </SidebarFooter>
      </Sidebar>
    );
  }

  // --- DESKTOP SIDEBAR ---
  return (
    <>
    <TooltipProvider delayDuration={0}>
      <Sidebar
        collapsible="offcanvas"
        className="!w-[68px] border-r border-primary/10 dark:border-primary/15 z-20 relative !h-svh !min-h-0 flex flex-col"
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        {/* Clean background with subtle warmth */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50/90 via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900/80" />

          {/* Soft warm orbs — not blue */}
          <div className="absolute top-24 -left-6 w-28 h-28 bg-amber-200/10 dark:bg-amber-500/5 rounded-full blur-2xl" />
          <div className="absolute bottom-40 -right-6 w-24 h-24 bg-rose-200/8 dark:bg-rose-400/4 rounded-full blur-2xl" />
        </div>

        <SidebarHeader className="relative border-b border-primary/10 dark:border-primary/15 p-2">
          <div className="flex items-center justify-center py-1">
            <OrgSwitcher
              currentOrgId={session?.user?.orgId}
              currentOrgName={session?.user?.orgName}
            />
          </div>
        </SidebarHeader>

        <SidebarContent className="relative p-2 bg-transparent overflow-y-auto overflow-x-hidden flex-1 min-h-0">
          {isFirstLoad && loading ? (
            <div className="flex flex-col items-center justify-center p-4 gap-2">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="w-11 h-11 rounded-xl bg-muted dark:bg-muted animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
          ) : (
            <SidebarGroup>
              <SidebarMenu className="space-y-1.5">
                {filteredSections.map((section, index) => {
                  const isSelected = selectedSection?.title === section.title;
                  const isHovered = hoveredSection === section.title;

                  return (
                    <SidebarMenuItem
                      key={section.title}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className="animate-in fade-in slide-in-from-left-2 duration-300"
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton
                            onClick={() => handleSectionClick(section)}
                            onMouseEnter={() => setHoveredSection(section.title)}
                            onMouseLeave={() => setHoveredSection(null)}
                            className={cn(
                              "relative w-full h-11 flex items-center justify-center rounded-xl transition-all duration-300 ease-out",
                              "hover:scale-105 active:scale-95",
                              "group overflow-hidden",
                              isSelected
                                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25 scale-105"
                                : "hover:bg-gray-100/70 dark:hover:bg-gray-800/30 hover:shadow-sm"
                            )}
                          >
                            <section.icon className={cn(
                              "relative h-5 w-5 transition-all duration-300",
                              isSelected
                                ? "text-white drop-shadow-sm"
                                : "text-slate-600 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300"
                            )} />
                            {section.title === 'Regulatorio' && vencimientosCount > 0 && (
                              <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                              </span>
                            )}
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          sideOffset={8}
                          className="font-semibold bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-0 shadow-lg shadow-emerald-500/20 px-3 py-2 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <section.icon className="h-4 w-4" />
                            {section.title}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter className="relative border-t border-primary/10 dark:border-primary/15 p-2">
          <SidebarMenu className="space-y-1.5">
            <SidebarMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => signOutAction()}
                    className={cn(
                      "relative w-full h-11 flex items-center justify-center rounded-xl transition-all duration-300 ease-out",
                      "hover:scale-105 active:scale-95",
                      "hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600",
                      "hover:shadow-lg hover:shadow-red-500/25",
                      "group"
                    )}
                  >
                    <LogOut className="h-5 w-5 text-slate-500/60 dark:text-slate-400/60 group-hover:text-white transition-colors duration-300" />
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  className="font-semibold bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-[0_4px_20px_rgba(255,255,255,0.4),0_8px_32px_rgba(239,68,68,0.3)] px-3 py-2 rounded-lg"
                >
                  Cerrar Sesión
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* Panel de navegación secundaria - desktop only */}
      <SecondaryNav
        section={selectedSection}
        onClose={() => setSelectedSection(null)}
      />
    </TooltipProvider>

    {/* Backdrop overlay - desktop only */}
    <div
      onClick={selectedSection ? () => setSelectedSection(null) : undefined}
      className={cn(
        "fixed inset-0 z-[5] bg-black/20 transition-opacity duration-300 hidden md:block",
        showOverlay ? "opacity-100" : "opacity-0 pointer-events-none",
        !selectedSection && "pointer-events-none"
      )}
    />
    </>
  );
});
