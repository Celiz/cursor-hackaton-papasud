"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { prepare, layout } from "@chenglou/pretext";
import { Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./AIChatProvider";

const SIDEBAR_CONTENT_WIDTH = 400 - 32; // sidebar - padding
const BUBBLE_MAX_RATIO = 0.85;
const BUBBLE_PADDING_X = 24; // px-3 * 2
const BUBBLE_PADDING_Y = 16; // py-2 * 2
const MESSAGE_GAP = 16; // space-y-4
const LINE_HEIGHT = 20;
const BODY_FONT = '400 14px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const BUFFER_PX = 200;

function measureMessageHeight(msg: ChatMessage, containerWidth: number): number {
  const bubbleWidth = containerWidth * BUBBLE_MAX_RATIO - BUBBLE_PADDING_X;

  // Strip markdown for measurement
  const plainText = msg.content
    .replace(/```[\s\S]*?```/g, (m) => "\n".repeat(m.split("\n").length))
    .replace(/\*\*|__/g, "")
    .replace(/\*|_/g, "")
    .replace(/`[^`]+`/g, (m) => m.slice(1, -1))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s/gm, "  ")
    .replace(/^#{1,3}\s/gm, "");

  const prepared = prepare(plainText, BODY_FONT);
  const result = layout(prepared, bubbleWidth, LINE_HEIGHT);

  // Extra height for markdown elements
  const codeBlocks = (msg.content.match(/```/g) || []).length / 2;
  const headers = (msg.content.match(/^#{1,3}\s/gm) || []).length;
  const extra = codeBlocks * 20 + headers * 8;

  // +16 for timestamp line, +padding, +gap
  return result.height + extra + BUBBLE_PADDING_Y + 16 + MESSAGE_GAP;
}

interface MeasuredItem {
  message: ChatMessage;
  height: number;
  top: number;
}

export function AIChatMessages({
  messages,
  isLoading,
  botName,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  botName: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevCount = useRef(0);

  // Measure all messages with Pretext
  const measured = useMemo(() => {
    let top = 0;
    const items: MeasuredItem[] = messages.map((msg) => {
      const height = measureMessageHeight(msg, SIDEBAR_CONTENT_WIDTH);
      const item = { message: msg, height, top };
      top += height;
      return item;
    });
    return { items, totalHeight: top };
  }, [messages]);

  // Visible range (only render what's in viewport + buffer)
  const visibleRange = useMemo(() => {
    if (measured.items.length === 0) return { first: 0, last: -1 };
    const start = scrollTop - BUFFER_PX;
    const end = scrollTop + viewportHeight + BUFFER_PX;

    let first = 0;
    let last = measured.items.length - 1;

    for (let i = 0; i < measured.items.length; i++) {
      if (measured.items[i].top + measured.items[i].height >= start) { first = i; break; }
    }
    for (let i = measured.items.length - 1; i >= 0; i--) {
      if (measured.items[i].top <= end) { last = i; break; }
    }
    return { first, last };
  }, [scrollTop, viewportHeight, measured]);

  // Track viewport
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setViewportHeight(e.contentRect.height);
    });
    obs.observe(el);
    setViewportHeight(el.clientHeight);
    return () => obs.disconnect();
  }, []);

  // Handle scroll
  const onScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 60);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (autoScroll && messages.length > prevCount.current) {
      const el = viewportRef.current;
      if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
    }
    prevCount.current = messages.length;
  }, [messages.length, autoScroll, measured.totalHeight]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="text-center text-muted-foreground py-8">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Hola! Soy {botName}.</p>
          <p className="text-xs mt-2">Preguntame lo que necesites.</p>
          <div className="mt-4 text-xs text-left bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="font-medium">Ejemplos:</p>
            <p>&quot;¿Cuántos clientes tengo?&quot;</p>
            <p>&quot;Facturas vencidas de este mes&quot;</p>
            <p>&quot;Buscá al cliente Martinez&quot;</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={viewportRef} className="flex-1 overflow-y-auto min-h-0" onScroll={onScroll}>
      <div
        className="relative p-4"
        style={{ height: measured.totalHeight + (isLoading ? 40 : 0) }}
      >
        {measured.items.slice(visibleRange.first, visibleRange.last + 1).map((item) => (
          <div
            key={item.message.id}
            className="absolute left-0 right-0 px-4"
            style={{ top: item.top }}
          >
            <MessageBubble message={item.message} />
          </div>
        ))}

        {isLoading && (
          <div
            className="absolute left-0 right-0 px-4"
            style={{ top: measured.totalHeight }}
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Pensando...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Message Bubble (kept from original) ---

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <div className="text-sm whitespace-pre-wrap">
          <FormattedContent content={message.content} />
        </div>
        <div
          className={cn(
            "text-[10px] mt-1",
            isUser ? "text-primary-foreground/60" : "text-muted-foreground"
          )}
        >
          {message.timestamp.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          const codeContent = part.replace(/```\w*\n?/g, "").replace(/```$/, "");
          return (
            <pre
              key={index}
              className="my-2 bg-gray-800 text-green-400 p-2 rounded text-xs overflow-x-auto"
            >
              {codeContent.trim()}
            </pre>
          );
        }

        const lines = part.split("\n");
        return (
          <span key={index}>
            {lines.map((line, lineIndex) => {
              const isLastLine = lineIndex === lines.length - 1;

              if (/^[\s]*[-*]\s/.test(line)) {
                const bulletContent = line.replace(/^[\s]*[-*]\s/, "");
                return (
                  <div key={lineIndex} className="flex items-start gap-1.5 ml-1">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{formatInlineText(bulletContent)}</span>
                  </div>
                );
              }

              const numberedMatch = line.match(/^[\s]*(\d+)\.\s(.+)$/);
              if (numberedMatch) {
                return (
                  <div key={lineIndex} className="flex items-start gap-1.5 ml-1">
                    <span className="text-primary font-medium min-w-[1rem]">{numberedMatch[1]}.</span>
                    <span>{formatInlineText(numberedMatch[2])}</span>
                  </div>
                );
              }

              if (line.trim() === "") return <br key={lineIndex} />;

              return (
                <span key={lineIndex}>
                  {formatInlineText(line)}
                  {!isLastLine && <br />}
                </span>
              );
            })}
          </span>
        );
      })}
    </>
  );
}

function formatInlineText(text: string): React.ReactNode {
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
