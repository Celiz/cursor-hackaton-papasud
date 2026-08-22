"use client";

import { useState } from "react";
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
import { MessageSquare, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface WhatsAppShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPhone?: string;
  defaultMessage?: string;
  documentType?: string; // "factura" | "servicio" | "general"
}

export function WhatsAppShareDialog({
  open,
  onOpenChange,
  defaultPhone = "",
  defaultMessage = "",
  documentType = "general",
}: WhatsAppShareDialogProps) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(defaultMessage);

  // Update when defaults change
  useState(() => {
    setPhone(defaultPhone);
    setMessage(defaultMessage);
  });

  const cleanPhoneNumber = (phoneStr: string): string => {
    // Remove all non-numeric characters
    let cleaned = phoneStr.replace(/\D/g, "");

    // If starts with 0, remove it (local format)
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }

    // If doesn't start with country code, add Argentina's code (54)
    if (!cleaned.startsWith("54")) {
      cleaned = "54" + cleaned;
    }

    return cleaned;
  };

  const validatePhone = (phoneStr: string): boolean => {
    const cleaned = cleanPhoneNumber(phoneStr);
    // Argentina numbers: 54 + area code (2-4 digits) + number (6-8 digits)
    // Total should be between 10-13 digits
    return cleaned.length >= 10 && cleaned.length <= 13;
  };

  const handleShare = () => {
    if (!phone.trim()) {
      toast.error("Debe ingresar un número de teléfono");
      return;
    }

    if (!validatePhone(phone)) {
      toast.error("Número de teléfono inválido");
      return;
    }

    const cleanedPhone = cleanPhoneNumber(phone);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;

    // Open WhatsApp in new tab
    window.open(whatsappUrl, "_blank");

    toast.success("WhatsApp abierto en nueva pestaña");
    onOpenChange(false);
  };

  const getPlaceholder = () => {
    switch (documentType) {
      case "factura":
        return "Ej: Hola, le enviamos su factura...";
      case "servicio":
        return "Ej: Su equipo está listo para retirar...";
      default:
        return "Escriba su mensaje...";
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            Compartir por WhatsApp
          </DialogTitle>
          <DialogDescription>
            Envíe el documento por WhatsApp al cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número de teléfono</Label>
            <Input
              id="phone"
              placeholder="Ej: 11 1234-5678 o 549111234567"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Puede ingresar con o sin código de área. Se formateará automáticamente.
            </p>
            {phone && validatePhone(phone) && (
              <Badge variant="outline" className="text-green-600 border-green-600">
                ✓ Número válido: +{cleanPhoneNumber(phone)}
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensaje</Label>
            <Textarea
              id="message"
              placeholder={getPlaceholder()}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              El documento debe ser enviado como imagen o PDF después de abrir WhatsApp.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button onClick={handleShare} className="bg-green-600 hover:bg-green-700">
            <MessageSquare className="h-4 w-4 mr-1" />
            Abrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
