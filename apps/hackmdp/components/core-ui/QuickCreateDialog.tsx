"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Loader2,
  Mic,
  MicOff,
  Search,
  Check,
  X,
  Wrench,
  Target,
  Calendar as CalendarIcon,
  User,
  Building2,
  ClipboardList,
  Wand2,
  ArrowUp,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { haptics } from "@/lib/haptics";
import { cn } from "@/lib/utils";

interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  items: ChatItem[];
}

type ChatItem =
  | { kind: "text"; content: string }
  | { kind: "thought"; content: string }
  | {
      kind: "tool";
      id: string;
      name: string;
      args: any;
      thought?: string;
      result?: any;
      status: "running" | "done" | "error";
    }
  | {
      kind: "proposal";
      entityType: "servicio" | "oportunidad" | "actividad" | "cliente";
      fields: Record<string, any>;
      resumen: string;
    };

type SSEEvent =
  | { type: "thinking" }
  | { type: "text"; content: string }
  | { type: "tool_call"; id: string; name: string; args: any; thought?: string }
  | { type: "tool_result"; id: string; name: string; result: any }
  | {
      type: "proposal";
      entityType: string;
      fields: Record<string, any>;
      resumen: string;
    }
  | { type: "done" }
  | { type: "error"; message: string };

// ──────────────────────────────────────────────────────────────────────────
// Entity metadata
// ──────────────────────────────────────────────────────────────────────────

const ENTITY_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string; path: string }
> = {
  servicio: {
    label: "Servicio técnico",
    icon: Wrench,
    color: "from-amber-500 to-orange-600",
    path: "/dashboard/servicios?action=new",
  },
  oportunidad: {
    label: "Oportunidad",
    icon: Target,
    color: "from-purple-500 to-indigo-600",
    path: "/dashboard/crm?action=new",
  },
  actividad: {
    label: "Actividad CRM",
    icon: CalendarIcon,
    color: "from-blue-500 to-cyan-600",
    path: "/dashboard/crm",
  },
  cliente: {
    label: "Cliente",
    icon: User,
    color: "from-emerald-500 to-green-600",
    path: "/dashboard/empresas?action=new",
  },
};

const TOOL_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  buscar_cliente: {
    label: "Buscando cliente",
    icon: Building2,
    color: "text-blue-500",
  },
  buscar_equipo: {
    label: "Buscando equipo",
    icon: Wrench,
    color: "text-amber-500",
  },
  buscar_tecnico: {
    label: "Buscando técnico",
    icon: User,
    color: "text-emerald-500",
  },
  buscar_laboratorio: {
    label: "Buscando laboratorio",
    icon: Building2,
    color: "text-cyan-500",
  },
  listar_estados_servicio: {
    label: "Consultando estados",
    icon: ClipboardList,
    color: "text-purple-500",
  },
  listar_tipos_servicio: {
    label: "Consultando tipos",
    icon: ClipboardList,
    color: "text-purple-500",
  },
  proponer_entidad: {
    label: "Preparando propuesta",
    icon: Sparkles,
    color: "text-indigo-500",
  },
};

const EXAMPLES = [
  "Nuevo servicio para Hospital Central, equipo Olympus CX41, no enciende, urgente",
  "Oportunidad con Sanatorio del Norte, están interesados en un hemograma Wiener, 800 mil",
  "Llamar mañana a las 10 a María Paz del lab Belgrano para seguimiento",
  "Nuevo cliente Lab Sur, CUIT 30-12345678-9, info@labsur.com.ar",
];

// ──────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────

export function QuickCreateDialog({ open, onOpenChange }: QuickCreateDialogProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset state on close
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      setMessages([]);
      setInput("");
      setLoading(false);
      setThinking(false);
      abortRef.current?.abort();
    }
  }, [open]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, thinking]);

  // Voice input
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Tu navegador no soporta reconocimiento de voz");
      return;
    }
    haptics.medium();
    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = (e: any) => {
      setListening(false);
      if (e.error !== "no-speech") toast.error("Error: " + e.error);
    };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  // Send a user message and stream the response
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;
    haptics.light();

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      items: [{ kind: "text", content: input.trim() }],
    };

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      items: [],
    };

    const updatedMessages = [...messages, userMsg, assistantMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setThinking(true);

    // Build the message history for the API (only role + content)
    const apiMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/quick-create/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";

        for (const frame of frames) {
          const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          const jsonStr = dataLine.slice(6);
          if (!jsonStr) continue;

          let event: SSEEvent;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          handleEvent(event, assistantMsg.id);
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        haptics.error();
        toast.error(err.message || "Error en la conversación");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? {
                  ...m,
                  items: [...m.items, { kind: "text", content: "⚠️ Error: " + err.message }],
                }
              : m
          )
        );
      }
    } finally {
      setLoading(false);
      setThinking(false);
      abortRef.current = null;
    }
  }, [input, loading, messages]);

  // Merge an SSE event into the assistant message being streamed
  const handleEvent = useCallback((event: SSEEvent, assistantId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== assistantId) return m;
        const items = [...m.items];
        let content = m.content;

        switch (event.type) {
          case "thinking":
            setThinking(true);
            return m;

          case "text": {
            setThinking(false);
            // Append or create a text item
            const last = items[items.length - 1];
            if (last && last.kind === "text") {
              last.content += "\n" + event.content;
            } else {
              items.push({ kind: "text", content: event.content });
            }
            content += event.content;
            return { ...m, items, content };
          }

          case "tool_call":
            setThinking(false);
            // If the thought is present and non-trivial, show it as a separate "thought" item before the tool chip
            if (event.thought && event.thought.trim().length > 0) {
              const lastItem = items[items.length - 1];
              // Avoid duplicating thoughts
              if (!(lastItem?.kind === "thought" && lastItem.content === event.thought)) {
                items.push({ kind: "thought", content: event.thought });
              }
            }
            items.push({
              kind: "tool",
              id: event.id,
              name: event.name,
              args: event.args,
              thought: event.thought,
              status: "running",
            });
            return { ...m, items };

          case "tool_result": {
            const idx = items.findIndex(
              (it) => it.kind === "tool" && it.id === event.id
            );
            if (idx >= 0) {
              const tool = items[idx] as Extract<ChatItem, { kind: "tool" }>;
              items[idx] = {
                ...tool,
                result: event.result,
                status: event.result?.ok ? "done" : "error",
              };
            }
            return { ...m, items };
          }

          case "proposal":
            items.push({
              kind: "proposal",
              entityType: event.entityType as any,
              fields: event.fields,
              resumen: event.resumen,
            });
            return { ...m, items };

          case "done":
            setThinking(false);
            return m;

          case "error":
            setThinking(false);
            items.push({
              kind: "text",
              content: "⚠️ " + event.message,
            });
            return { ...m, items };

          default:
            return m;
        }
      })
    );
  }, []);

  const handleConfirmProposal = (proposal: Extract<ChatItem, { kind: "proposal" }>) => {
    const meta = ENTITY_META[proposal.entityType];
    if (!meta) return;
    sessionStorage.setItem(
      "quickCreateDraft",
      JSON.stringify({
        entityType: proposal.entityType,
        fields: proposal.fields,
      })
    );
    haptics.success();
    onOpenChange(false);
    router.push(meta.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleExampleClick = (ex: string) => {
    setInput(ex);
    textareaRef.current?.focus();
  };

  const isEmpty = messages.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 overflow-hidden flex flex-col gap-0">
        {/* Header */}
        <div className="px-5 py-3 border-b bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-purple-950/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Gest1e · Asistente de IA</h2>
              <p className="text-[11px] text-muted-foreground">
                Describí lo que querés crear — te voy ayudando
              </p>
            </div>
          </div>
        </div>

        {/* Chat messages / welcome */}
        <ScrollArea className="flex-1 min-h-0">
          <div ref={scrollRef} className="p-4 space-y-4">
            {isEmpty && (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-xl shadow-purple-500/30"
                >
                  <Wand2 className="h-8 w-8 text-white" />
                </motion.div>
                <div>
                  <p className="text-sm font-medium">Hola! Soy Gest1e</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Puedo ayudarte a crear servicios técnicos, oportunidades,
                    actividades o clientes. Probá con un ejemplo:
                  </p>
                </div>
                <div className="w-full max-w-md space-y-1.5 pt-2">
                  {EXAMPLES.map((ex, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleExampleClick(ex)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <span className="text-purple-500 mr-1">›</span> {ex}
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onConfirmProposal={handleConfirmProposal}
              />
            ))}

            {thinking && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span>Gest1e está pensando...</span>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-3 bg-background">
          <div className="relative flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describí lo que querés crear..."
              className="min-h-[42px] max-h-[120px] resize-none pr-12 text-sm rounded-2xl"
              disabled={loading}
              rows={1}
            />
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={listening ? stopListening : startListening}
              className={cn(
                "absolute right-[52px] bottom-2 p-2 rounded-lg transition-colors",
                listening
                  ? "bg-red-500 text-white animate-pulse"
                  : "text-muted-foreground hover:bg-accent"
              )}
              title={listening ? "Detener" : "Dictar por voz"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center text-white shadow-md transition-colors shrink-0",
                loading || !input.trim()
                  ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                  : "bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/30"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Message bubble
// ──────────────────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onConfirmProposal,
}: {
  msg: ChatMessage;
  onConfirmProposal: (p: Extract<ChatItem, { kind: "proposal" }>) => void;
}) {
  const isUser = msg.role === "user";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div className={cn("max-w-[85%] space-y-1.5", isUser && "flex flex-col items-end")}>
        {msg.items.length === 0 && !isUser && (
          <div className="text-xs text-muted-foreground italic">...</div>
        )}

        {msg.items.map((item, idx) => {
          if (item.kind === "text") {
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
                  isUser
                    ? "bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-md shadow-md shadow-purple-500/20"
                    : "bg-muted rounded-bl-md"
                )}
              >
                {item.content}
              </div>
            );
          }

          if (item.kind === "thought") {
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-1.5 text-[11px] text-muted-foreground italic pl-1 py-0.5"
              >
                <Sparkles className="h-3 w-3 text-purple-400 shrink-0 mt-0.5" />
                <span>{item.content}</span>
              </motion.div>
            );
          }

          if (item.kind === "tool") {
            return <ToolCallChip key={idx} tool={item} />;
          }

          if (item.kind === "proposal") {
            return (
              <ProposalCard
                key={idx}
                proposal={item}
                onConfirm={() => onConfirmProposal(item)}
              />
            );
          }

          return null;
        })}
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Tool call chip
// ──────────────────────────────────────────────────────────────────────────

function ToolCallChip({ tool }: { tool: Extract<ChatItem, { kind: "tool" }> }) {
  const meta = TOOL_META[tool.name] || {
    label: tool.name,
    icon: Search,
    color: "text-gray-500",
  };
  const Icon = meta.icon;

  const queryText =
    tool.args?.query ||
    tool.args?.nombre ||
    tool.args?.entityType ||
    "";

  const summary = tool.result?.summary || "";
  const matches = tool.result?.data?.matches || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "rounded-xl border bg-background/50 backdrop-blur-sm p-2.5 text-xs space-y-1.5",
        tool.status === "running" && "border-purple-300 dark:border-purple-700",
        tool.status === "done" && "border-emerald-300/40 dark:border-emerald-800/30",
        tool.status === "error" && "border-red-300 dark:border-red-700"
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn("p-1 rounded", meta.color)}>
          {tool.status === "running" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
        </div>
        <span className="font-medium text-[11px]">{meta.label}</span>
        {queryText && (
          <span className="text-muted-foreground text-[11px] truncate">
            · {queryText}
          </span>
        )}
      </div>

      {tool.status === "done" && summary && (
        <div className="text-[11px] text-muted-foreground pl-6">{summary}</div>
      )}

      {/* Show match previews */}
      {tool.status === "done" && matches.length > 0 && matches.length <= 3 && (
        <div className="pl-6 space-y-0.5">
          {matches.slice(0, 3).map((m: any, i: number) => (
            <div
              key={i}
              className="text-[10.5px] text-muted-foreground truncate"
            >
              <span className="text-emerald-500">✓</span>{" "}
              {m.nombre || m.nombre_completo || m.marca || "Resultado"}
              {m.modelo && ` ${m.modelo}`}
              {m.numero_serie && ` (${m.numero_serie})`}
            </div>
          ))}
        </div>
      )}

      {tool.status === "error" && (
        <div className="text-[11px] text-red-500 pl-6">
          {tool.result?.error || "Error"}
        </div>
      )}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Proposal card (confirm/cancel)
// ──────────────────────────────────────────────────────────────────────────

function ProposalCard({
  proposal,
  onConfirm,
}: {
  proposal: Extract<ChatItem, { kind: "proposal" }>;
  onConfirm: () => void;
}) {
  const meta = ENTITY_META[proposal.entityType];
  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="rounded-2xl border-2 border-purple-300 dark:border-purple-700 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 p-4 space-y-3 shadow-lg shadow-purple-500/10"
    >
      <div className="flex items-center gap-2.5">
        <div className={cn("p-2 rounded-xl bg-gradient-to-br text-white shadow-md", meta.color)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{meta.label}</p>
          <p className="text-[11px] text-muted-foreground">Listo para crear</p>
        </div>
        <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
          propuesta
        </Badge>
      </div>

      <p className="text-sm text-foreground/90 leading-relaxed">{proposal.resumen}</p>

      {Object.keys(proposal.fields).length > 0 && (
        <details className="text-[11px]">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Ver todos los campos ({Object.keys(proposal.fields).length})
          </summary>
          <div className="mt-2 space-y-0.5 pl-2 border-l-2 border-purple-200 dark:border-purple-800">
            {Object.entries(proposal.fields).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-muted-foreground capitalize">
                  {k.replace(/_/g, " ")}:
                </span>
                <span className="font-medium truncate">
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="primary"
          size="small"
          onClick={onConfirm}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md"
        >
          <Check className="h-4 w-4 mr-1" />
          Crear y editar
        </Button>
      </div>
    </motion.div>
  );
}
