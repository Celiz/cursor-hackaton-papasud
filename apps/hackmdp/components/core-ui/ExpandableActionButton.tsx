"use client";

import React, { useRef, useState, useEffect, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExpandDirection = "down" | "up" | "left" | "right";
export type ExpandPosition = "inline" | "absolute";

export interface ExpandableActionButtonProps {
  /** Icon to show in collapsed state */
  icon: ReactNode;
  /** Optional label text next to icon */
  label?: string;
  /** Title/tooltip for the button */
  title?: string;
  /** Whether to show expand indicator (chevron) */
  showExpandIndicator?: boolean;
  /** Direction to expand */
  expandDirection?: ExpandDirection;
  /** Position mode: inline (affects layout) or absolute (overlay) */
  position?: ExpandPosition;
  /** Width when expanded (px or 'auto') */
  expandedWidth?: number | "auto";
  /** Whether action is in progress */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Content to render when expanded */
  children: ReactNode;
  /** Callback when expanded state changes */
  onExpandChange?: (expanded: boolean) => void;
  /** Close on click outside (default: true) */
  closeOnClickOutside?: boolean;
  /** Optional className for container */
  className?: string;
  /** Optional className for button */
  buttonClassName?: string;
  /** Color variant */
  variant?: "default" | "primary" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: {
    collapsed: "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
    expanded: "bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-700 shadow-lg",
    text: "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100",
  },
  primary: {
    collapsed: "border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30",
    expanded: "bg-white dark:bg-zinc-900 border-blue-400 dark:border-blue-600 shadow-lg",
    text: "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300",
  },
  success: {
    collapsed: "border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30",
    expanded: "bg-white dark:bg-zinc-900 border-emerald-400 dark:border-emerald-600 shadow-lg",
    text: "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300",
  },
  warning: {
    collapsed: "border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-900/30",
    expanded: "bg-white dark:bg-zinc-900 border-amber-400 dark:border-amber-600 shadow-lg",
    text: "text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300",
  },
  danger: {
    collapsed: "border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30",
    expanded: "bg-white dark:bg-zinc-900 border-red-400 dark:border-red-600 shadow-lg",
    text: "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300",
  },
};

const chevronMap = {
  down: ChevronDown,
  up: ChevronUp,
  left: ChevronLeft,
  right: ChevronRight,
};

// Calculate position classes for absolute positioning
const getAbsolutePositionClasses = (direction: ExpandDirection): string => {
  switch (direction) {
    case "down":
      return "top-full left-0 mt-1";
    case "up":
      return "bottom-full left-0 mb-1";
    case "left":
      return "right-full top-0 mr-1";
    case "right":
      return "left-full top-0 ml-1";
    default:
      return "top-full left-0 mt-1";
  }
};

// Animation variants based on direction
const getAnimationVariants = (direction: ExpandDirection) => {
  const variants = {
    down: { initial: { opacity: 0, y: -10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } },
    up: { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 10 } },
    left: { initial: { opacity: 0, x: 10 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 10 } },
    right: { initial: { opacity: 0, x: -10 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -10 } },
  };
  return variants[direction];
};

export function ExpandableActionButton({
  icon,
  label,
  title,
  showExpandIndicator = true,
  expandDirection = "down",
  position = "absolute",
  expandedWidth = 280,
  loading = false,
  disabled = false,
  children,
  onExpandChange,
  closeOnClickOutside = true,
  className,
  buttonClassName,
  variant = "default",
}: ExpandableActionButtonProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const styles = variantStyles[variant];
  const ChevronIcon = chevronMap[expandDirection];
  const animationVariants = getAnimationVariants(expandDirection);

  // Handle expand state change
  const handleExpandChange = (newExpanded: boolean) => {
    setExpanded(newExpanded);
    onExpandChange?.(newExpanded);
  };

  // Click outside handler
  useEffect(() => {
    if (!closeOnClickOutside) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleExpandChange(false);
      }
    };

    if (expanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [expanded, closeOnClickOutside]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && expanded) {
        handleExpandChange(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [expanded]);

  const handleButtonClick = () => {
    if (disabled || loading) return;
    handleExpandChange(!expanded);
  };

  // Render inline mode (morphing button)
  if (position === "inline") {
    return (
      <div ref={containerRef} className={cn("relative", className)}>
        <motion.div
          layout
          className={cn(
            "flex items-center overflow-hidden rounded-md border transition-colors",
            expanded ? styles.expanded : `bg-transparent ${styles.collapsed}`
          )}
          initial={false}
          animate={{
            width: expanded ? (expandedWidth === "auto" ? "auto" : expandedWidth) : "auto",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <AnimatePresence mode="wait">
            {!expanded ? (
              <motion.button
                key="collapsed"
                type="button"
                onClick={handleButtonClick}
                disabled={disabled || loading}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium transition-colors",
                  styles.text,
                  (disabled || loading) && "opacity-50 cursor-not-allowed",
                  buttonClassName
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                title={title}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
                {label && <span>{label}</span>}
                {showExpandIndicator && <ChevronIcon className="h-3 w-3 ml-0.5" />}
              </motion.button>
            ) : (
              <motion.div
                key="expanded"
                className="w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, delay: 0.1 }}
              >
                {children}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // Render absolute mode (overlay dropdown)
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <motion.button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled || loading}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
          expanded ? styles.expanded : `bg-transparent ${styles.collapsed}`,
          styles.text,
          (disabled || loading) && "opacity-50 cursor-not-allowed",
          buttonClassName
        )}
        title={title}
        whileTap={{ scale: 0.98 }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {label && <span>{label}</span>}
        {showExpandIndicator && (
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronIcon className="h-3 w-3 ml-0.5" />
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className={cn(
              "absolute z-50 rounded-md border bg-white dark:bg-zinc-900 shadow-lg overflow-hidden",
              styles.expanded,
              getAbsolutePositionClasses(expandDirection)
            )}
            style={{ width: expandedWidth === "auto" ? "auto" : expandedWidth }}
            initial={animationVariants.initial}
            animate={animationVariants.animate}
            exit={animationVariants.exit}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS for common patterns
// ============================================================================

export interface ExpandableOptionItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface ExpandableOptionsListProps {
  title?: string;
  options: ExpandableOptionItem[];
  selectedIds?: string[];
  onToggle?: (id: string) => void;
  onSelectAll?: () => void;
  onSelectNone?: () => void;
  multiSelect?: boolean;
  showCheckboxes?: boolean;
  maxHeight?: number;
}

/** Helper component for rendering a list of selectable options */
export function ExpandableOptionsList({
  title,
  options,
  selectedIds = [],
  onToggle,
  onSelectAll,
  onSelectNone,
  multiSelect = true,
  showCheckboxes = true,
  maxHeight = 128,
}: ExpandableOptionsListProps) {
  const allSelected = options.length > 0 && selectedIds.length === options.length;

  return (
    <div className="p-2 space-y-2">
      {(title || (multiSelect && onSelectAll && onSelectNone)) && (
        <div className="flex items-center justify-between px-1">
          {title && (
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {title}
            </span>
          )}
          {multiSelect && onSelectAll && onSelectNone && options.length > 0 && (
            <button
              type="button"
              onClick={allSelected ? onSelectNone : onSelectAll}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {allSelected ? "Ninguno" : "Todos"}
            </button>
          )}
        </div>
      )}

      <div className="space-y-1 overflow-y-auto" style={{ maxHeight }}>
        {options.map((option, idx) => (
          <motion.button
            key={option.id}
            type="button"
            onClick={() => onToggle?.(option.id)}
            disabled={option.disabled}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors",
              selectedIds.includes(option.id)
                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
              option.disabled && "opacity-50 cursor-not-allowed"
            )}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.03 }}
          >
            {showCheckboxes && (
              <div
                className={cn(
                  "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                  selectedIds.includes(option.id)
                    ? "bg-blue-500 border-blue-500"
                    : "border-zinc-300 dark:border-zinc-600"
                )}
              >
                {selectedIds.includes(option.id) && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            )}
            {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
            <span className="truncate flex-1">{option.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

interface ExpandableActionsFooterProps {
  children: ReactNode;
  className?: string;
}

/** Helper component for footer with action buttons */
export function ExpandableActionsFooter({ children, className }: ExpandableActionsFooterProps) {
  return (
    <div className={cn("flex gap-1.5 p-2 pt-1 border-t border-zinc-200 dark:border-zinc-700", className)}>
      {children}
    </div>
  );
}

interface ExpandableActionBtnProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  label: string;
  variant?: "primary" | "secondary";
  className?: string;
}

/** Helper component for action buttons in footer */
export function ExpandableActionBtn({
  onClick,
  disabled,
  loading,
  icon,
  label,
  variant = "secondary",
  className,
}: ExpandableActionBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded transition-colors",
        variant === "primary"
          ? "bg-blue-500 text-white hover:bg-blue-600 disabled:bg-zinc-100 disabled:dark:bg-zinc-800 disabled:text-zinc-400 disabled:cursor-not-allowed"
          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        className
      )}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : icon}
      {label}
    </button>
  );
}

interface ExpandableInputViewProps {
  title?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onBack?: () => void;
  showBack?: boolean;
  submitLabel?: string;
  submitIcon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  type?: "text" | "email" | "number";
  validate?: (value: string) => boolean;
}

/** Helper component for input view (like manual email entry) */
export function ExpandableInputView({
  title,
  placeholder,
  value,
  onChange,
  onSubmit,
  onBack,
  showBack = true,
  submitLabel = "Enviar",
  submitIcon,
  loading,
  disabled,
  type = "text",
  validate,
}: ExpandableInputViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isValid = validate ? validate(value) : value.length > 0;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  return (
    <motion.div
      className="p-2 space-y-2"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center gap-2 px-1">
        {showBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {title && (
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </span>
        )}
      </div>

      <div className="relative">
        <input
          ref={inputRef}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValid) {
              e.preventDefault();
              onSubmit();
            }
            if (e.key === "Escape" && onBack) {
              onBack();
            }
          }}
          className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!isValid || loading || disabled}
        className={cn(
          "w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
          isValid && !disabled
            ? "bg-blue-500 text-white hover:bg-blue-600"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : submitIcon}
        {submitLabel}
      </button>
    </motion.div>
  );
}
