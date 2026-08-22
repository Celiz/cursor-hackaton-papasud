"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

interface RefreshButtonProps {
  onClick: () => void | Promise<void>;
  loading?: boolean;
  className?: string;
  showLabel?: boolean;
}

export function RefreshButton({ onClick, loading: externalLoading, className, showLabel = true }: RefreshButtonProps) {
  const [internalLoading, setInternalLoading] = React.useState(false);

  // Use external loading if provided, otherwise use internal
  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading;

  const handleClick = async () => {
    if (externalLoading === undefined) {
      // Only manage internal state if no external loading prop
      setInternalLoading(true);
      try {
        await onClick();
      } finally {
        // Minimum animation time for visual feedback
        setTimeout(() => {
          setInternalLoading(false);
        }, 500);
      }
    } else {
      // Always await onClick to ensure proper promise handling
      await onClick();
    }
  };

  return (
    <Button
      size="tiny"
      type="outline"
      onClick={handleClick}
      disabled={isLoading}
      className={cn("h-8", className)}
      icon={
        <RefreshCw
          className={cn(
            "h-4 w-4 transition-transform",
            isLoading && "animate-spin"
          )}
        />
      }
    >
      {showLabel && <span className="font-semibold">Actualizar</span>}
    </Button>
  );
}
