"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Mail, Paperclip, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface EmailTemplate {
  key: string;
  label: string;
  subject: string;
  body: string;
}

interface SendEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo?: string[];
  defaultSubject?: string;
  defaultBody?: string;
  attachmentName?: string;
  templates?: EmailTemplate[];
  onSend: (data: { to: string[]; subject: string; body: string }) => Promise<void>;
}

export function SendEmailDialog({
  open,
  onOpenChange,
  defaultTo = [],
  defaultSubject = "",
  defaultBody = "",
  attachmentName,
  templates,
  onSend,
}: SendEmailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    to: defaultTo,
    subject: defaultSubject,
    body: defaultBody,
  });

  // Sync with props when they change
  React.useEffect(() => {
    if (open) {
      setFormData({
        to: defaultTo,
        subject: defaultSubject,
        body: defaultBody,
      });
      setEmailInput("");
      setSelectedTemplate(null);
    }
  }, [open, defaultTo, defaultSubject, defaultBody]);

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template.key);
    setFormData((prev) => ({
      ...prev,
      subject: template.subject,
      body: template.body,
    }));
  };

  const handleAddEmail = () => {
    const email = emailInput.trim();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Email inválido");
      return;
    }

    if (formData.to.includes(email)) {
      toast.error("Este email ya fue agregado");
      return;
    }

    setFormData({
      ...formData,
      to: [...formData.to, email],
    });
    setEmailInput("");
  };

  const handleRemoveEmail = (email: string) => {
    setFormData({
      ...formData,
      to: formData.to.filter((e) => e !== email),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.to.length === 0) {
      toast.error("Debe agregar al menos un destinatario");
      return;
    }

    if (!formData.subject.trim()) {
      toast.error("El asunto es requerido");
      return;
    }

    setLoading(true);
    const destLabel =
      formData.to.length === 1 ? formData.to[0] : `${formData.to.length} destinatarios`;
    const toastId = toast.loading(`Enviando email a ${destLabel}...`);

    try {
      await onSend(formData);
      toast.success(`Email enviado a ${destLabel}`, { id: toastId });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al enviar email", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar por Email
          </DialogTitle>
          <DialogDescription>
            Completa los datos y envía el documento por correo electrónico
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plantillas */}
          {templates && templates.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Plantilla
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => handleSelectTemplate(t)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                      selectedTemplate === t.key
                        ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                        : "bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-700"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Destinatarios */}
          <div className="space-y-2">
            <Label htmlFor="email-input">Para *</Label>
            <div className="flex gap-2">
              <Input
                id="email-input"
                type="email"
                placeholder="correo@ejemplo.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button type="button" onClick={handleAddEmail} size="sm">
                Agregar
              </Button>
            </div>

            {/* Lista de emails */}
            {formData.to.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.to.map((email) => (
                  <Badge key={email} variant="secondary" className="pl-2 pr-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-2 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Asunto */}
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              placeholder="Asunto del email"
              required
            />
          </div>

          {/* Mensaje */}
          <div className="space-y-2">
            <Label htmlFor="body">Mensaje</Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) =>
                setFormData({ ...formData, body: e.target.value })
              }
              placeholder="Escribe un mensaje personalizado (opcional)"
              rows={4}
            />
          </div>

          {/* Adjunto */}
          {attachmentName && (
            <div className="bg-muted/50 p-3 rounded-lg flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                Se adjuntará: <span className="font-medium">{attachmentName}</span>
              </span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Email"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
