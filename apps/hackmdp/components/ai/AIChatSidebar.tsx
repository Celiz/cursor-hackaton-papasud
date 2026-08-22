"use client";

import React, { useRef, useEffect, useState } from "react";
import {
  Bot,
  X,
  Send,
  Trash2,
  Loader2,
  Mic,
  MicOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIChat } from "./AIChatProvider";
import { AIChatMessages } from "./AIChatMessages";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = 400;

export function AIChatSidebar() {
  const {
    isOpen,
    messages,
    isLoading,
    botName,
    close,
    sendMessage,
    clearMessages,
  } = useAIChat();

  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input.trim();
    setInput("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      setRecordingTime(0);

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: mr.mimeType });
        if (blob.size < 1000) return;

        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("file", blob, "audio.webm");
          const res = await fetch("/api/agent/transcribe", { method: "POST", body: fd });
          const data = await res.json();
          if (data.text?.trim()) {
            await sendMessage(data.text.trim());
          }
        } catch {
          console.error("Transcription failed");
        } finally {
          setTranscribing(false);
        }
      };

      mr.start();
      setRecording(true);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      console.error("Microphone access denied");
    }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <aside
      className={cn(
        "fixed right-0 top-0 h-screen bg-background border-l border-border shadow-xl flex flex-col flex-shrink-0 transition-all duration-200 ease-out overflow-hidden z-40",
        isOpen ? "opacity-100" : "opacity-0"
      )}
      style={{ width: isOpen ? SIDEBAR_WIDTH : 0 }}
    >
      {isOpen && (
        <>
          {/* Header — uses org primary color */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary">
            <div className="flex items-center gap-2 text-primary-foreground">
              <Bot className="h-5 w-5" />
              <span className="font-semibold">{botName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="small"
                onClick={clearMessages}
                className="h-8 w-8 !p-0 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                title="Reiniciar chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="small"
                onClick={close}
                className="h-8 w-8 !p-0 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages — Pretext virtualized */}
          <AIChatMessages messages={messages} isLoading={isLoading} botName={botName} />

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-border">
            {recording ? (
              <div className="flex items-center gap-3 py-1">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm text-destructive font-medium">Grabando</span>
                <span className="text-xs text-muted-foreground font-mono">{formatTime(recordingTime)}</span>
                <Button
                  type="button"
                  size="small"
                  variant="destructive"
                  onClick={stopRecording}
                  className="ml-auto h-9 px-3 text-xs"
                >
                  Enviar
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={transcribing ? "Transcribiendo..." : "Escribí tu consulta..."}
                  className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] max-h-[120px]"
                  rows={1}
                  disabled={isLoading || transcribing}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={startRecording}
                  disabled={isLoading || transcribing}
                  className="h-11 w-11 !p-0"
                  title="Grabar audio"
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  size="small"
                  disabled={!input.trim() || isLoading || transcribing}
                  className="h-11 w-11 !p-0"
                  onClick={handleSubmit}
                >
                  {isLoading || transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </form>
        </>
      )}
    </aside>
  );
}
