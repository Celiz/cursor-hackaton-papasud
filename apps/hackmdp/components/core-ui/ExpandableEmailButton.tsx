"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@locus/ui";
import {
  Mail,
  Loader2,
  Check,
  ChevronDown,
  Send,
  UserPlus,
  ArrowLeft,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpandableEmailButtonProps {
  /** Array of client emails */
  emails: string[];
  /** Function to send email to an address (single email) */
  onSendEmail: (email: string) => Promise<void>;
  /** Function to send email to multiple addresses at once (optional) */
  onSendEmailMultiple?: (emails: string[]) => Promise<void>;
  /** Whether email is currently being sent */
  sending?: boolean;
  /** Optional className for the container */
  className?: string;
  /** Optional label text next to icon */
  label?: string;
  /** Always show dropdown even with single email */
  alwaysExpand?: boolean;
}

export function ExpandableEmailButton({
  emails,
  onSendEmail,
  onSendEmailMultiple,
  sending = false,
  className,
  label,
  alwaysExpand = false,
}: ExpandableEmailButtonProps) {
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [internalSending, setInternalSending] = useState(false);
  const emailButtonRef = useRef<HTMLDivElement>(null);
  const manualEmailInputRef = useRef<HTMLInputElement>(null);

  const isSending = sending || internalSending;

  // Filter valid emails
  const clienteEmails = emails.filter(Boolean);

  // Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emailButtonRef.current && !emailButtonRef.current.contains(event.target as Node)) {
        setEmailExpanded(false);
        setShowManualInput(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEmailExpanded(false);
        setShowManualInput(false);
      }
    };

    if (emailExpanded) {
      // Use capture phase to ensure we catch events before they're stopped
      document.addEventListener('mousedown', handleClickOutside, true);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [emailExpanded]);

  const handleEmailButtonClick = () => {
    if (clienteEmails.length === 0) {
      // No emails, expand with manual input directly
      setEmailExpanded(true);
      setShowManualInput(true);
      setTimeout(() => manualEmailInputRef.current?.focus(), 100);
      return;
    }

    if (clienteEmails.length === 1 && !alwaysExpand) {
      // Only one email, send directly
      handleSendToAddress(clienteEmails[0]);
      return;
    }

    // Multiple emails or alwaysExpand, expand to select
    setEmailExpanded(!emailExpanded);
    setShowManualInput(false);
    if (!emailExpanded) {
      setSelectedEmails([...clienteEmails]); // Pre-select all
    }
  };

  const handleShowManualInput = () => {
    setShowManualInput(true);
    setTimeout(() => manualEmailInputRef.current?.focus(), 100);
  };

  const handleBackToList = () => {
    setShowManualInput(false);
    setManualEmail("");
  };

  const toggleEmailSelection = (email: string) => {
    setSelectedEmails(prev =>
      prev.includes(email)
        ? prev.filter(e => e !== email)
        : [...prev, email]
    );
  };

  const handleSendToAddress = async (email: string) => {
    setInternalSending(true);
    try {
      await onSendEmail(email);
    } finally {
      setInternalSending(false);
    }
  };

  const handleSendToSelected = async () => {
    if (selectedEmails.length === 0) {
      toast.error('Seleccione al menos un email');
      return;
    }

    setEmailExpanded(false);
    setInternalSending(true);

    try {
      // If multiple emails and onSendEmailMultiple is provided, use it
      if (selectedEmails.length > 1 && onSendEmailMultiple) {
        await onSendEmailMultiple(selectedEmails);
      } else {
        // Fallback: send to each email individually
        for (const email of selectedEmails) {
          await onSendEmail(email);
        }
      }
    } finally {
      setInternalSending(false);
    }
  };

  const handleManualEmailSubmit = async () => {
    if (!manualEmail || !manualEmail.includes('@')) {
      toast.error('Ingrese un email valido');
      return;
    }
    setEmailExpanded(false);
    setShowManualInput(false);
    await handleSendToAddress(manualEmail);
    setManualEmail("");
  };

  return (
    <div ref={emailButtonRef} className={cn("relative", className)}>
      {/* Button - always visible */}
      <motion.button
        type="button"
        onClick={handleEmailButtonClick}
        disabled={isSending}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md border transition-colors",
          emailExpanded
            ? "bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-700 shadow-sm"
            : "bg-transparent border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
          "text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100",
          isSending && "opacity-50 cursor-not-allowed"
        )}
        title={clienteEmails.length > 1 ? "Enviar por email (varios destinatarios)" : "Enviar por email"}
        whileTap={{ scale: 0.98 }}
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        {label && <span className="text-sm">{label}</span>}
        {(clienteEmails.length > 1 || alwaysExpand) && (
          <motion.span
            animate={{ rotate: emailExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="h-3 w-3 ml-0.5" />
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown - positioned absolute with higher z-index for sheet contexts */}
      <AnimatePresence>
        {emailExpanded && (
          <motion.div
            className="absolute top-full left-0 mt-1 z-[100] w-72 rounded-md border bg-white dark:bg-zinc-900 border-blue-300 dark:border-blue-700 shadow-xl overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >
            <AnimatePresence mode="wait">
              {!showManualInput ? (
                // Email selection view
                <motion.div
                  key="email-list"
                  className="p-2 space-y-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.15 }}
                >
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Enviar a:
                      </span>
                      {clienteEmails.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedEmails.length === clienteEmails.length) {
                              setSelectedEmails([]);
                            } else {
                              setSelectedEmails([...clienteEmails]);
                            }
                          }}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {selectedEmails.length === clienteEmails.length ? 'Ninguno' : 'Todos'}
                        </button>
                      )}
                    </div>
                    {clienteEmails.length > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {clienteEmails.map((email, idx) => (
                          <motion.button
                            key={email}
                            type="button"
                            onClick={() => toggleEmailSelection(email)}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors",
                              selectedEmails.includes(email)
                                ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            )}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                              selectedEmails.includes(email)
                                ? "bg-blue-500 border-blue-500"
                                : "border-zinc-300 dark:border-zinc-600"
                            )}>
                              {selectedEmails.includes(email) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span className="truncate flex-1">{email}</span>
                          </motion.button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={handleShowManualInput}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                      >
                        <UserPlus className="h-3 w-3" />
                        Otro
                      </button>
                      {clienteEmails.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSendToSelected}
                          disabled={selectedEmails.length === 0 || isSending}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded transition-colors",
                            selectedEmails.length > 0
                              ? "bg-blue-500 text-white hover:bg-blue-600"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                          )}
                        >
                          {isSending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                          Enviar ({selectedEmails.length})
                        </button>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  // Manual input view
                  <motion.div
                    key="manual-input"
                    className="p-2 space-y-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-center gap-2 px-1">
                      {clienteEmails.length > 0 && (
                        <button
                          type="button"
                          onClick={handleBackToList}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 dark:text-zinc-400 transition-colors"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        Enviar a otro email
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        ref={manualEmailInputRef}
                        type="email"
                        placeholder="ejemplo@email.com"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleManualEmailSubmit();
                          }
                          if (e.key === 'Escape') {
                            if (clienteEmails.length > 0) {
                              handleBackToList();
                            } else {
                              setEmailExpanded(false);
                              setShowManualInput(false);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {manualEmail && (
                        <button
                          type="button"
                          onClick={() => setManualEmail("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleManualEmailSubmit}
                      disabled={!manualEmail || !manualEmail.includes('@') || isSending}
                      className={cn(
                        "w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        manualEmail && manualEmail.includes('@')
                          ? "bg-blue-500 text-white hover:bg-blue-600"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                      )}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Enviar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
}
