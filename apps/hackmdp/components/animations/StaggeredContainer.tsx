"use client";

import React, { useState, useEffect } from "react";
import { motion, type Variants } from "framer-motion";

interface StaggeredContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  enabled?: boolean;
  id?: string;
}

/**
 * Contenedor que anima sus hijos con efecto stagger (escalonado)
 * Anima solo una vez por mount del componente
 */
export function StaggeredContainer({ children, className, delay = 0, enabled = true, id = "default" }: StaggeredContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Antes del mount, renderizar sin animación (SSR)
  if (!mounted) {
    return <div className={className}>{children}</div>;
  }

  // Si no está enabled, renderizar sin motion
  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.08,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface StaggeredItemProps {
  children: React.ReactNode;
  className?: string;
}

// Variants para los items
const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
      mass: 0.5,
    },
  },
};

/**
 * Item individual que se anima dentro de un StaggeredContainer
 */
export function StaggeredItem({ children, className }: StaggeredItemProps) {
  return (
    <motion.div
      className={className}
      variants={itemVariants}
    >
      {children}
    </motion.div>
  );
}
