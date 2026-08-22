"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatContextValue {
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  botName: string;

  toggle: () => void;
  open: () => void;
  close: () => void;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => Promise<void>;
}

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function useAIChat() {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error("useAIChat must be used within an AIChatProvider");
  }
  return context;
}

interface AIChatProviderProps {
  children: React.ReactNode;
}

export function AIChatProvider({ children }: AIChatProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [botName, setBotName] = useState("Gest1e");
  const [loaded, setLoaded] = useState(false);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Load existing conversation when sidebar opens
  useEffect(() => {
    if (isOpen && !loaded) {
      loadConversation();
    }
  }, [isOpen, loaded]);

  const loadConversation = async () => {
    try {
      const res = await fetch("/api/agent/chat");
      const data = await res.json();

      if (data.bot?.name) setBotName(data.bot.name);

      if (data.conversation?.messages) {
        const restored: ChatMessage[] = [];
        for (const msg of data.conversation.messages) {
          if ((msg.role === "user" || msg.role === "assistant") && msg.content) {
            restored.push({
              id: generateId(),
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.ts || Date.now()),
            });
          }
        }
        setMessages(restored);
      }

      setLoaded(true);
    } catch (err) {
      console.error("Error loading agent conversation:", err);
      setLoaded(true);
    }
  };

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content.trim() }),
        });

        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Error al procesar mensaje");

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error: any) {
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: `Error: ${error.message || "No se pudo procesar tu mensaje"}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const clearMessages = useCallback(async () => {
    try {
      await fetch("/api/agent/chat", { method: "DELETE" });
      setMessages([]);
    } catch (err) {
      console.error("Error clearing messages:", err);
    }
  }, []);

  const value: AIChatContextValue = {
    isOpen,
    messages,
    isLoading,
    botName,
    toggle,
    open,
    close,
    sendMessage,
    clearMessages,
  };

  return (
    <AIChatContext.Provider value={value}>
      {children}
    </AIChatContext.Provider>
  );
}
