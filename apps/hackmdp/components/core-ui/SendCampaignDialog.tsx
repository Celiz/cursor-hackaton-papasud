"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Send, Users, Ban, FlaskConical } from "lucide-react";
import { EmailCampaign } from "@/app/dashboard/email-marketing/campaigns/columns";

interface Preflight {
  total: number;
  enviables: number;
  excluidos: {
    sin_email: number;
    formato_invalido: number;
    unsubscribed: number;
    bounced_estado: number;
    hard_bounce: number;
  };
}

interface SendCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: EmailCampaign | null;
  onSuccess?: () => void;
}

const EXCLUIDOS_LABELS: Record<keyof Preflight["excluidos"], string> = {
  sin_email: "Sin email",
  formato_invalido: "Formato inválido",
  unsubscribed: "Dados de baja",
  bounced_estado: "Marcados como rebote",
  hard_bounce: "Con rebote duro",
};

export function SendCampaignDialog({
  open,
  onOpenChange,
  campaign,
  onSuccess,
}: SendCampaignDialogProps) {
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const sendable =
    !!campaign && (campaign.estado === "borrador" || campaign.estado === "pausada");

  useEffect(() => {
    if (!open || !campaign) return;
    setPreflight(null);
    if (!sendable) return;
    setLoading(true);
    fetch(`/api/email/campaigns/${campaign.id}/preflight`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setPreflight(d);
      })
      .catch((e) => toast.error(e.message || "Error al chequear destinatarios"))
      .finally(() => setLoading(false));
  }, [open, campaign, sendable]);

  const handleSend = async () => {
    if (!campaign) return;
    setSending(true);
    try {
      const res = await fetch("/api/email/campaigns/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaign.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar campaña");
      toast.success(data.message || "Campaña en cola");
      onSuccess?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const excluidosEntries = preflight
    ? (Object.entries(preflight.excluidos) as [keyof Preflight["excluidos"], number][]).filter(
        ([, v]) => v > 0,
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !sending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Enviar campaña
          </DialogTitle>
          <DialogDescription>
            {campaign ? `"${campaign.nombre}" — ${campaign.asunto}` : ""}
          </DialogDescription>
        </DialogHeader>

        {!sendable ? (
          <p className="py-6 text-sm text-muted-foreground">
            Solo se pueden enviar campañas en estado <b>borrador</b> o <b>pausada</b>.
            Esta campaña está en estado <b>{campaign?.estado}</b>.
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : preflight ? (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Destinatarios enviables
              </div>
              <span className="text-2xl font-semibold text-green-600">
                {preflight.enviables.toLocaleString()}
              </span>
            </div>

            {excluidosEntries.length > 0 && (
              <div className="rounded-lg border px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Ban className="h-3.5 w-3.5" />
                  Se excluyen {preflight.total - preflight.enviables} de {preflight.total}
                </div>
                <ul className="space-y-1 text-sm">
                  {excluidosEntries.map(([k, v]) => (
                    <li key={k} className="flex justify-between">
                      <span className="text-muted-foreground">{EXCLUIDOS_LABELS[k]}</span>
                      <span className="tabular-nums">{v.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <FlaskConical className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                El envío se procesa en lotes. Si el sistema está en modo prueba, los
                emails NO salen por SMTP (se marcan como procesados).
              </span>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            htmlType="button"
            type="secondary"
            onClick={() => onOpenChange(false)}
            disabled={sending}
          >
            Cancelar
          </Button>
          <Button
            htmlType="button"
            type="primary"
            onClick={handleSend}
            disabled={sending || !sendable || !preflight || preflight.enviables === 0}
            iconLeft={
              sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />
            }
          >
            {sending
              ? "Encolando..."
              : preflight
                ? `Enviar a ${preflight.enviables.toLocaleString()}`
                : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
