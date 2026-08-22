"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/hooks/use-session";

export interface FavoriteItem {
  title: string;
  url: string;
  icon: string; // Nombre del icono como string para serialización
  sectionTitle: string;
}

const FAVORITES_KEY_PREFIX = "locus_sidebar_favorites";

function getFavoritesKey(orgId?: string) {
  return orgId ? `${FAVORITES_KEY_PREFIX}_${orgId}` : FAVORITES_KEY_PREFIX;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;

  // Cargar favoritos del localStorage al montar o al cambiar de org
  useEffect(() => {
    try {
      const key = getFavoritesKey(orgId);
      const stored = localStorage.getItem(key);
      if (stored) {
        setFavorites(JSON.parse(stored));
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
    setIsLoaded(true);
  }, [orgId]);

  // Guardar en localStorage cuando cambian los favoritos
  useEffect(() => {
    if (isLoaded) {
      try {
        const key = getFavoritesKey(orgId);
        localStorage.setItem(key, JSON.stringify(favorites));
      } catch (error) {
        console.error("Error saving favorites:", error);
      }
    }
  }, [favorites, isLoaded, orgId]);

  const addFavorite = useCallback((item: FavoriteItem) => {
    setFavorites(prev => {
      // Evitar duplicados
      if (prev.some(f => f.url === item.url)) {
        return prev;
      }
      return [...prev, item];
    });
  }, []);

  const removeFavorite = useCallback((url: string) => {
    setFavorites(prev => prev.filter(f => f.url !== url));
  }, []);

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    setFavorites(prev => {
      const exists = prev.some(f => f.url === item.url);
      if (exists) {
        return prev.filter(f => f.url !== item.url);
      }
      return [...prev, item];
    });
  }, []);

  const isFavorite = useCallback((url: string) => {
    return favorites.some(f => f.url === url);
  }, [favorites]);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    isLoaded,
  };
}
