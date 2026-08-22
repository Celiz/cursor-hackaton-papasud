"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";
import { Star, X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFavorites, type FavoriteItem } from "@/hooks/use-favorites";
import * as LucideIcons from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FavoritesQuickAccessProps {
  onNavigate?: () => void;
}

// Función para obtener el icono de Lucide por nombre
function getIconByName(name: string): React.ComponentType<{ className?: string }> | null {
  const icons = LucideIcons as Record<string, unknown>;
  const iconComponent = icons[name];
  if (typeof iconComponent === "function") {
    return iconComponent as React.ComponentType<{ className?: string }>;
  }
  return null;
}

export const FavoritesQuickAccess = memo(function FavoritesQuickAccess({ onNavigate }: FavoritesQuickAccessProps) {
  const { favorites, removeFavorite, isLoaded } = useFavorites();

  if (!isLoaded || favorites.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-2"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-yellow-500" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Accesos Rápidos
          </span>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-yellow-300/50 to-transparent dark:from-yellow-600/30" />
      </div>

      {/* Favorites list */}
      <div className="space-y-0.5 px-1">
        <AnimatePresence mode="popLayout">
          {favorites.map((favorite, index) => {
            const IconComponent = getIconByName(favorite.icon);

            return (
              <motion.div
                key={favorite.url}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, height: 0 }}
                transition={{ delay: index * 0.03 }}
                className="relative group/fav"
              >
                <a
                  href={favorite.url}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200",
                    "hover:bg-yellow-100/60 dark:hover:bg-yellow-900/20",
                    "hover:shadow-sm hover:shadow-yellow-500/10",
                    "text-gray-700 dark:text-gray-300 hover:text-yellow-700 dark:hover:text-yellow-300",
                    "group"
                  )}
                >
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                  {IconComponent && (
                    <IconComponent className="h-3.5 w-3.5 text-purple-500/70 dark:text-purple-400/70 group-hover:text-purple-600 dark:group-hover:text-purple-400 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-sm font-medium truncate">{favorite.title}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-[80px]">
                    {favorite.sectionTitle}
                  </span>
                </a>
                {/* Botón de quitar */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeFavorite(favorite.url);
                      }}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md transition-all duration-200",
                        "opacity-0 group-hover/fav:opacity-100",
                        "text-gray-400 hover:text-red-500 hover:bg-red-100/50 dark:hover:bg-red-900/30"
                      )}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    Quitar de favoritos
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Separator */}
      <div className="mx-3 mt-2 mb-1 h-px bg-gradient-to-r from-purple-200/50 via-purple-300/30 to-transparent dark:from-purple-700/30 dark:via-purple-600/20" />
    </motion.div>
  );
});
