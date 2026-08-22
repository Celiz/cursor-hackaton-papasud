"use client";

import { useState, useEffect } from "react";
import { X, Info, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHelpContent, isFirstVisit, markAsVisited } from "@/lib/page-help-content";
import { motion, AnimatePresence } from "framer-motion";

interface WelcomeBannerProps {
  pageKey: string;
  content: PageHelpContent;
  alwaysShow?: boolean; // Para forzar mostrar incluso si ya fue visitado
}

export function WelcomeBanner({ pageKey, content, alwaysShow = false }: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (alwaysShow || isFirstVisit(pageKey)) {
      setIsVisible(true);
      if (!alwaysShow) {
        markAsVisited(pageKey);
      }
    }
  }, [pageKey, alwaysShow]);

  if (!isMounted || !isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="relative border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800 overflow-hidden">
          {/* Header - Siempre visible */}
          <div className="p-4 flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100">
                    {content.title}
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    {content.description}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={toggleExpand}
                    className="h-7 w-7 p-0 hover:bg-purple-200 dark:hover:bg-purple-900"
                    iconLeft={isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  />
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={handleDismiss}
                    className="h-7 w-7 p-0 hover:bg-purple-200 dark:hover:bg-purple-900"
                    iconLeft={<X className="h-4 w-4" />}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contenido expandible */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 pl-[52px] space-y-4">
                  {/* Casos de uso - Más compacto */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-xs text-purple-800 dark:text-purple-200 uppercase tracking-wide">
                      Funciones principales
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {content.useCases.slice(0, 4).map((useCase, index) => (
                        <div key={index} className="flex gap-2 text-xs">
                          <span className="text-purple-500 mt-0.5">✓</span>
                          <span className="text-purple-700 dark:text-purple-300">{useCase}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ejemplos - Solo los primeros 2 */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-xs text-purple-800 dark:text-purple-200 uppercase tracking-wide">
                      Ejemplos rápidos
                    </h4>
                    <div className="space-y-1.5">
                      {content.examples.slice(0, 2).map((example, index) => (
                        <div key={index} className="flex gap-2 text-xs p-2 rounded bg-white/50 dark:bg-purple-950/30">
                          <span className="text-purple-600 font-bold">{index + 1}.</span>
                          <span className="text-purple-700 dark:text-purple-300">{example}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Primer tip si existe */}
                  {content.tips && content.tips.length > 0 && (
                    <div className="flex gap-2 p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                      <span className="text-amber-600 text-sm">💡</span>
                      <span className="text-xs text-amber-800 dark:text-amber-200">
                        <strong>Tip:</strong> {content.tips[0]}
                      </span>
                    </div>
                  )}

                  {/* Footer con acción */}
                  <div className="flex items-center justify-between pt-2 border-t border-purple-200 dark:border-purple-800">
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      Haz clic en el botón ? para ver toda la ayuda
                    </span>
                    <Button
                      variant="ghost"
                      size="small"
                      onClick={handleDismiss}
                      className="text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900"
                    >
                      Entendido
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
