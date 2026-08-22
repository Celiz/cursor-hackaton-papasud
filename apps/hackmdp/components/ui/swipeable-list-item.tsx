"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, PanInfo, animate } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

export interface SwipeAction {
  /** Icon (lucide-react or similar ReactNode) */
  icon: React.ReactNode;
  /** Short label shown next to the icon */
  label: string;
  /** Background color class (e.g. "bg-red-500") */
  color: string;
  /** Callback when action is triggered */
  onAction: () => void;
}

interface SwipeableListItemProps {
  children: React.ReactNode;
  /** Action revealed by swiping LEFT (item slides to the right — for positive actions) */
  leftAction?: SwipeAction;
  /** Action revealed by swiping RIGHT (item slides to the left — for destructive actions) */
  rightAction?: SwipeAction;
  /** Disable swipe entirely */
  disabled?: boolean;
  /** Additional class on outer wrapper */
  className?: string;
  /** Swipe threshold in pixels before the action triggers (default 80) */
  threshold?: number;
}

/**
 * A list item with swipe-to-reveal actions.
 * - Drag RIGHT to reveal the left-side action (usually positive: complete, approve)
 * - Drag LEFT to reveal the right-side action (usually destructive: delete, archive)
 *
 * When the drag crosses `threshold`, a haptic pulse fires.
 * If released past `threshold * 1.5`, the action is triggered and the item springs back.
 *
 * Works best inside a list with `overflow-hidden` on the rows.
 */
export function SwipeableListItem({
  children,
  leftAction,
  rightAction,
  disabled = false,
  className,
  threshold = 80,
}: SwipeableListItemProps) {
  const x = useMotionValue(0);
  const [thresholdReached, setThresholdReached] = React.useState<"left" | "right" | null>(null);

  // Background colors fade in as user swipes
  const leftBgOpacity = useTransform(x, [0, threshold], [0, 1]);
  const rightBgOpacity = useTransform(x, [-threshold, 0], [1, 0]);
  const leftIconScale = useTransform(x, [0, threshold, threshold * 1.5], [0.5, 1, 1.15]);
  const rightIconScale = useTransform(x, [-threshold * 1.5, -threshold, 0], [1.15, 1, 0.5]);

  // Haptic pulse when crossing threshold in either direction
  React.useEffect(() => {
    const unsub = x.on("change", (latest) => {
      if (latest > threshold && thresholdReached !== "left" && leftAction) {
        haptics.swipeThreshold();
        setThresholdReached("left");
      } else if (latest < -threshold && thresholdReached !== "right" && rightAction) {
        haptics.swipeThreshold();
        setThresholdReached("right");
      } else if (Math.abs(latest) < threshold * 0.5 && thresholdReached !== null) {
        setThresholdReached(null);
      }
    });
    return () => unsub();
  }, [x, threshold, leftAction, rightAction, thresholdReached]);

  const handleDragEnd = (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeX = info.offset.x;
    const commitThreshold = threshold * 1.5;

    if (swipeX > commitThreshold && leftAction) {
      // Commit left action
      haptics.success();
      animate(x, 300, { duration: 0.15 });
      setTimeout(() => {
        leftAction.onAction();
        animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      }, 150);
    } else if (swipeX < -commitThreshold && rightAction) {
      // Commit right action
      haptics.medium();
      animate(x, -300, { duration: 0.15 });
      setTimeout(() => {
        rightAction.onAction();
        animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
      }, 150);
    } else {
      // Snap back
      animate(x, 0, { type: "spring", stiffness: 500, damping: 40 });
    }
    setThresholdReached(null);
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Left action background (revealed when dragging right) */}
      {leftAction && (
        <motion.div
          style={{ opacity: leftBgOpacity }}
          className={cn(
            "absolute inset-0 flex items-center justify-start px-5 pointer-events-none",
            leftAction.color
          )}
        >
          <motion.div
            style={{ scale: leftIconScale }}
            className="flex items-center gap-2 text-white font-medium"
          >
            {leftAction.icon}
            <span className="text-sm">{leftAction.label}</span>
          </motion.div>
        </motion.div>
      )}

      {/* Right action background (revealed when dragging left) */}
      {rightAction && (
        <motion.div
          style={{ opacity: rightBgOpacity }}
          className={cn(
            "absolute inset-0 flex items-center justify-end px-5 pointer-events-none",
            rightAction.color
          )}
        >
          <motion.div
            style={{ scale: rightIconScale }}
            className="flex items-center gap-2 text-white font-medium"
          >
            <span className="text-sm">{rightAction.label}</span>
            {rightAction.icon}
          </motion.div>
        </motion.div>
      )}

      {/* Foreground draggable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: rightAction ? -200 : 0, right: leftAction ? 200 : 0 }}
        dragElastic={0.15}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-background touch-pan-y"
      >
        {children}
      </motion.div>
    </div>
  );
}
