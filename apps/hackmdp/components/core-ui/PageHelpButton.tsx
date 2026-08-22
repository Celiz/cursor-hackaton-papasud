"use client";

import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PageHelpContent } from "@/lib/page-help-content";

interface PageHelpButtonProps {
  content: PageHelpContent;
  size?: "small" | "medium" | "large";
}

export function PageHelpButton({ content, size = "small" }: PageHelpButtonProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="h-8 w-8 p-0 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/20 inline-flex items-center justify-center transition-colors"
          aria-label="Ver ayuda"
        >
          <HelpCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] max-h-[600px] overflow-y-auto" align="start">
        <div className="space-y-4">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-purple-600" />
              <h3 className="font-semibold text-lg">{content.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {content.description}
            </p>
          </div>

          {/* Casos de Uso */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <span className="text-purple-600">✓</span>
              ¿Para qué sirve?
            </h4>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {content.useCases.map((useCase, index) => (
                <li key={index} className="flex gap-2">
                  <span className="text-purple-400 mt-0.5">•</span>
                  <span>{useCase}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ejemplos */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <span className="text-purple-600">💡</span>
              Ejemplos prácticos
            </h4>
            <ul className="space-y-1.5 text-sm">
              {content.examples.map((example, index) => (
                <li key={index} className="flex gap-2 p-2 rounded bg-muted/50">
                  <span className="text-purple-600 font-bold">{index + 1}.</span>
                  <span className="text-muted-foreground">{example}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Tips (opcional) */}
          {content.tips && content.tips.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <h4 className="font-medium text-sm flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <span>💡</span>
                Consejos útiles
              </h4>
              <ul className="space-y-1.5 text-sm">
                {content.tips.map((tip, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-amber-500 mt-0.5">→</span>
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer */}
          <div className="text-xs text-muted-foreground border-t pt-3 italic">
            Haz clic en el botón ? en cualquier momento para ver esta ayuda
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
