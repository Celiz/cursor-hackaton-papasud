"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useQuickCreate } from "./QuickCreateProvider";
import { haptics } from "@/lib/haptics";

/**
 * Floating action button that opens the AI quick-create dialog.
 * Shown globally. Tap to open, long-press triggers voice input automatically.
 */
export function QuickCreateFAB() {
  const { open } = useQuickCreate();

  return (
    <motion.button
      type="button"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.5 }}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      onClick={() => {
        haptics.medium();
        open();
      }}
      className="fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white shadow-2xl shadow-purple-500/40 flex items-center justify-center md:hidden"
      aria-label="Crear rápido con IA"
      title="Crear rápido (Ctrl+Shift+K)"
    >
      {/* Pulsing ring for attention */}
      <span className="absolute inset-0 rounded-full bg-purple-500 opacity-30 animate-ping" />
      <Sparkles className="h-6 w-6 relative" />
    </motion.button>
  );
}
