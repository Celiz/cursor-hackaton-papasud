"use client";

import React, { memo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight, X, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Section } from "@/lib/sidebar-links";

// Wrappear next/link con motion para mantener animaciones + client-side nav.
const MotionLink = motion(Link);
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useFavorites, type FavoriteItem } from "@/hooks/use-favorites";
import { useUserPermissions } from "@/lib/hooks/use-user-permissions";
import { useVencimientosCriticosCount } from "@/lib/hooks/use-regulatory";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FavoritesQuickAccess } from "./FavoritesQuickAccess";

interface SecondaryNavProps {
  section: Section | null;
  onClose: () => void;
}

export const SecondaryNav = memo(function SecondaryNav({ section, onClose }: SecondaryNavProps) {
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { toggleFavorite, isFavorite } = useFavorites();
  const { isAdmin, canAccess } = useUserPermissions();
  const { count: vencimientosCount } = useVencimientosCriticosCount();

  // Filtrar items basado en permisos
  const filteredItems = React.useMemo(() => {
    if (!section) return [];
    if (isAdmin) return section.items;

    return section.items
      .filter(item => !item.permission || canAccess(item.permission))
      .map(item => ({
        ...item,
        // Filtrar subitems también
        subItems: item.subItems?.filter(sub => !sub.permission || canAccess(sub.permission))
      }));
  }, [section, isAdmin, canAccess]);

  const toggleItem = (title: string) => {
    setOpenItems(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const handleToggleFavorite = (e: React.MouseEvent, item: { title: string; url?: string; icon: React.ComponentType<any> }) => {
    e.preventDefault();
    e.stopPropagation();
    if (!item.url) return;

    const favoriteItem: FavoriteItem = {
      title: item.title,
      url: item.url,
      icon: item.icon.name || item.icon.displayName || 'Circle',
      sectionTitle: section?.title || '',
    };
    toggleFavorite(favoriteItem);
  };

  return (
    <AnimatePresence>
      {section && (
        <motion.div
          key="secondary-nav"
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className="fixed left-[68px] top-0 bottom-0 w-72 z-10 flex flex-col overflow-hidden"
        >
          {/* Solid background base */}
          <div className="absolute inset-0 bg-white dark:bg-gray-900" />
          {/* Background layers */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-primary/5/50 to-primary/10/70 dark:from-gray-900 dark:via-gray-900 dark:to-primary/95/50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-border/40 via-transparent to-transparent dark:from-primary/20" />

          {/* Floating orbs */}
          <div className="absolute top-32 -right-8 w-32 h-32 bg-primary/30/30 dark:bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-0 w-24 h-24 bg-primary/50/20 dark:bg-primary/50/10 rounded-full blur-2xl" />

          {/* Border */}
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-border/60 via-primary/30/40 to-border/60 dark:from-primary/40 dark:via-primary/30 dark:to-primary/40" />

          {/* Shadow overlay */}
          <div className="absolute inset-0 shadow-2xl shadow-primary/50/20 pointer-events-none" />

          {/* Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative flex items-center justify-between h-14 px-4 border-b border-border/50 dark:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-primary rounded-lg blur-sm opacity-60" />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/50 via-primary to-primary shadow-lg shadow-primary/50/40">
                  <section.icon className="h-4.5 w-4.5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                  {section.title}
                </h2>
                <p className="text-xs text-primary/70 dark:text-primary/50/70">
                  {section.subtitle || `${filteredItems.length} ${filteredItems.length === 1 ? 'opción' : 'opciones'}`}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-primary/10 dark:hover:bg-primary/90/40 transition-colors"
            >
              <X className="h-4 w-4 text-primary dark:text-primary/50" />
            </motion.button>
          </motion.div>

          {/* Content */}
          <div className="relative flex-1 overflow-y-auto p-3 space-y-1">
            {/* Favoritos - Accesos Rápidos (scoped per org via use-favorites) */}
            <FavoritesQuickAccess onNavigate={onClose} />

            {filteredItems.map((item, index) => {
              if (item.subItems && item.subItems.length > 0) {
                const isOpen = openItems.includes(item.title);

                return (
                  <motion.div
                    key={item.title}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <Collapsible
                      open={isOpen}
                      onOpenChange={() => toggleItem(item.title)}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          onMouseEnter={() => setHoveredItem(item.title)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={cn(
                            "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
                            "hover:bg-primary/10/70 dark:hover:bg-primary/90/40",
                            "hover:shadow-md hover:shadow-primary/50/15",
                            "hover:scale-[1.02] active:scale-[0.98]",
                            "group overflow-hidden",
                            isOpen && "bg-primary/10/50 dark:bg-primary/90/30"
                          )}
                        >
                          {/* Shimmer effect — only animate on enter */}
                          <div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                            style={{
                              transform: hoveredItem === item.title ? 'translateX(100%)' : 'translateX(-100%)',
                              transition: hoveredItem === item.title ? 'transform 700ms ease-out' : 'none',
                            }}
                          />

                          <item.icon className={cn(
                            "relative h-4 w-4 transition-all duration-300 flex-shrink-0",
                            isOpen
                              ? "text-primary dark:text-primary/50"
                              : "text-primary/50/70 dark:text-primary/50/70 group-hover:text-primary dark:group-hover:text-primary/50"
                          )} />
                          <span className={cn(
                            "relative flex-1 text-left text-sm font-medium transition-colors duration-300",
                            isOpen
                              ? "text-primary/90 dark:text-primary/10"
                              : "text-gray-700 dark:text-gray-300"
                          )}>
                            {item.title}
                          </span>
                          <ChevronRight className={cn(
                            "relative h-4 w-4 text-primary/50/50 dark:text-primary/50/50 transition-all duration-300 flex-shrink-0",
                            isOpen && "rotate-90 text-primary dark:text-primary/50"
                          )} />
                          {item.badge && (
                            <span className={cn(
                              "relative rounded-full px-2 py-0.5 text-xs font-bold shadow-sm",
                              item.badge === "live"
                                ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/30"
                                : "bg-gradient-to-r from-primary/50 to-primary text-white shadow-primary/50/30"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent className="overflow-hidden">
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="pt-1 pb-2"
                        >
                          <div className="ml-7 space-y-0.5 border-l-2 border-primary/30/50 dark:border-primary/50 pl-3">
                            {item.subItems.map((subItem, subIndex) => (
                              <MotionLink
                                key={subItem.url}
                                href={subItem.url}
                                onClick={onClose}
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.03 * subIndex }}
                                className={cn(
                                  "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200",
                                  "hover:bg-primary/10/60 dark:hover:bg-primary/90/30",
                                  "hover:translate-x-1",
                                  "text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary/30"
                                )}
                              >
                                <subItem.icon className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="text-sm">{subItem.title}</span>
                              </MotionLink>
                            ))}
                          </div>
                        </motion.div>
                      </CollapsibleContent>
                    </Collapsible>
                  </motion.div>
                );
              }

              // Item sin subitems
              const itemIsFavorite = item.url ? isFavorite(item.url) : false;
              return (
                <motion.div
                  key={item.title}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.05 * index }}
                  onMouseEnter={() => setHoveredItem(item.title)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="relative group/item"
                >
                  <Link
                    href={item.url || "#"}
                    onClick={onClose}
                    className={cn(
                      "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300",
                      "hover:bg-primary/10/70 dark:hover:bg-primary/90/40",
                      "hover:shadow-md hover:shadow-primary/50/15",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      "text-gray-700 dark:text-gray-300 hover:text-primary/90 dark:hover:text-white",
                      "group overflow-hidden"
                    )}
                  >
                    {/* Shimmer effect — only animate on enter */}
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      style={{
                        transform: hoveredItem === item.title ? 'translateX(100%)' : 'translateX(-100%)',
                        transition: hoveredItem === item.title ? 'transform 700ms ease-out' : 'none',
                      }}
                    />

                    <item.icon className="relative h-4 w-4 flex-shrink-0 text-primary/50/70 dark:text-primary/50/70 group-hover:text-primary dark:group-hover:text-primary/50 transition-colors duration-300" />
                    <span className="relative flex-1 text-sm font-medium">{item.title}</span>
                    {item.url === '/dashboard/regulatorio/vencimientos' && vencimientosCount > 0 && (
                      <span className="relative min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 text-[11px] font-bold bg-red-500 text-white shadow-sm shadow-red-500/30">
                        {vencimientosCount}
                      </span>
                    )}
                    {item.badge && (
                      <span className={cn(
                        "relative rounded-full px-2 py-0.5 text-xs font-bold shadow-sm",
                        item.badge === "live"
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/30"
                          : "bg-gradient-to-r from-primary/50 to-primary text-white shadow-primary/50/30"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </Link>
                  {/* Botón de favorito */}
                  {item.url && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => handleToggleFavorite(e, item)}
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200",
                            "opacity-0 group-hover/item:opacity-100",
                            itemIsFavorite
                              ? "opacity-100 text-yellow-500 hover:text-yellow-600"
                              : "text-gray-400 hover:text-yellow-500 hover:bg-yellow-100/50 dark:hover:bg-yellow-900/30"
                          )}
                        >
                          <Star className={cn("h-3.5 w-3.5", itemIsFavorite && "fill-current")} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {itemIsFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
