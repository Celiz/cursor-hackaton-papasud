"use client";

import React from "react";
import { motion } from "framer-motion";

interface LoadingStep {
  label: string;
  color: string;
  isLoading: boolean;
  isComplete: boolean;
}

interface ConsoleLoaderProps {
  className?: string;
  loadingSteps?: LoadingStep[];
}

/**
 * Loader minimalista con animación de barras progresivas
 * Muestra el progreso real de cada recurso
 */
export function ConsoleLoader({ className, loadingSteps }: ConsoleLoaderProps) {
  // Si no se pasan steps personalizados, usar valores por defecto
  const defaultSteps: LoadingStep[] = [
    { label: "Base de datos", color: "from-blue-600 to-blue-400", isLoading: true, isComplete: false },
    { label: "Módulos", color: "from-purple-600 to-purple-400", isLoading: true, isComplete: false },
    { label: "Servicios", color: "from-pink-600 to-pink-400", isLoading: true, isComplete: false },
    { label: "Interfaz", color: "from-violet-600 to-violet-400", isLoading: true, isComplete: false },
  ];

  const steps = loadingSteps || defaultSteps;

  return (
    <div className={`flex flex-col items-center justify-center gap-8 ${className || ""}`}>
      {/* Logo o marca */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
        }}
        className="text-center"
      >
        <div className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent mb-2">
          Gestie
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Sistema de Gestión Empresarial
        </div>
      </motion.div>

      {/* Barras de progreso con labels */}
      <div className="flex flex-col gap-4 w-80">
        {steps.map((step, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: index * 0.1,
              duration: 0.3,
            }}
            className="space-y-1.5"
          >
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-gray-700 dark:text-gray-300">{step.label}</span>
              {step.isComplete ? (
                <span className="text-green-600 dark:text-green-400">✓ Listo</span>
              ) : step.isLoading ? (
                <motion.span
                  className="text-gray-500 dark:text-gray-400"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  Cargando...
                </motion.span>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">Esperando...</span>
              )}
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className={`h-full bg-gradient-to-r ${step.color}`}
                initial={{ width: "0%" }}
                animate={{
                  width: step.isComplete ? "100%" : step.isLoading ? "100%" : "0%"
                }}
                transition={{
                  duration: step.isComplete ? 0.3 : 1.2,
                  repeat: step.isComplete ? 0 : (step.isLoading ? Infinity : 0),
                  ease: step.isComplete ? "easeOut" : "easeInOut",
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
