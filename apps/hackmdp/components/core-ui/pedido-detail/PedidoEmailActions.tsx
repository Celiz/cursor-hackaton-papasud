"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ExpandableEmailButton } from "../ExpandableEmailButton";
import { SendEmailDialog } from "../SendEmailDialog";
import type { PedidoCallbacks } from "./types";

interface PedidoEmailActionsProps {
  pedidoId: string;
  pedidoData: any;
  cliente: any;
  brandName: string;
  callbacks: PedidoCallbacks;
}

function getEmailTemplates(pedidoData: any, brandName: string) {
  const clienteNombre = pedidoData.cliente?.nombre || pedidoData.clientes?.nombre || 'cliente';
  const numero = pedidoData.numero || pedidoData.id?.slice(0, 8);
  const itemsList = (pedidoData.items || pedidoData.pedidos_items || [])
    .map((i: any) => `• ${i.producto?.nombre || i.nombre || i.descripcion} x${i.cantidad} - ${formatCurrency(i.subtotal || 0)}`)
    .join('\n');
  const totalStr = formatCurrency(pedidoData.total || 0);

  const templates = [
    {
      key: 'confirmacion',
      label: 'Confirmación de pedido',
      subject: `Pedido #${numero} recibido - ${brandName}`,
      body: `Hola ${clienteNombre},\n\nTu pedido #${numero} fue recibido correctamente.\n\nDetalle:\n${itemsList}\n\nTotal: ${totalStr}\n\nTe avisamos cuando esté listo.\n\nGracias por tu compra.`,
    },
    {
      key: 'pago',
      label: 'Confirmación de pago',
      subject: `Pago confirmado - Pedido #${numero}`,
      body: `Hola ${clienteNombre},\n\nConfirmamos que recibimos el pago de tu pedido #${numero} por ${totalStr}.\n\nVamos a comenzar a preparar tu pedido.\n\nGracias.`,
      show: ['pagado', 'preparando', 'enviado', 'entregado'].includes(pedidoData.estado),
    },
    {
      key: 'preparacion',
      label: 'Pedido en preparación',
      subject: `Tu pedido #${numero} está siendo preparado`,
      body: `Hola ${clienteNombre},\n\nTu pedido #${numero} está siendo preparado por nuestro equipo.\n\nTe avisamos cuando esté listo para el envío.\n\nGracias por tu paciencia.`,
      show: ['preparando', 'enviado'].includes(pedidoData.estado),
    },
    {
      key: 'enviado',
      label: 'Pedido enviado',
      subject: `Tu pedido #${numero} fue despachado`,
      body: `Hola ${clienteNombre},\n\nTu pedido #${numero} fue despachado y está en camino.\n\n${pedidoData.transporte_cliente?.nombre ? `Transporte: ${pedidoData.transporte_cliente.nombre}\n` : ''}Te avisamos cualquier novedad.\n\nGracias.`,
      show: ['enviado', 'entregado'].includes(pedidoData.estado),
    },
    {
      key: 'remito',
      label: 'Remito del pedido',
      subject: `Remito - Pedido #${numero}`,
      body: `Hola ${clienteNombre},\n\nTe enviamos el detalle de tu pedido #${numero}:\n\n${itemsList}\n\nTotal: ${totalStr}\nMétodo de pago: ${pedidoData.metodo_pago === 'mercadopago' ? 'Mercado Pago' : pedidoData.metodo_pago || '-'}\n\nAnte cualquier consulta no dudes en contactarnos.`,
    },
    {
      key: 'personalizado',
      label: 'Email personalizado',
      subject: `Pedido #${numero} - ${brandName}`,
      body: '',
    },
  ];

  return templates.filter(t => t.show === undefined || t.show);
}

export function PedidoEmailActions({
  pedidoId,
  pedidoData,
  cliente,
  brandName,
  callbacks,
}: PedidoEmailActionsProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailDefaults, setEmailDefaults] = useState({ to: [] as string[], subject: '', body: '' });

  const handleSendEmail = async (data: { to: string[]; subject: string; body: string }) => {
    const res = await fetch('/api/ren-email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: data.to,
        subject: data.subject,
        body: data.body,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al enviar email');
    }

    if (pedidoId) {
      await fetch(`/api/pedidos-ventas/${pedidoId}/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'nota',
          contenido: `Email enviado a ${data.to.join(', ')}: "${data.subject}"`,
        }),
      });
      callbacks.mutateNotas();
    }
  };

  if (!cliente?.email) return null;

  return (
    <>
      {/* Custom email button */}
      <div className="mb-4">
        <Button
          type="outline"
          size="small"
          block
          icon={<Mail />}
          onClick={() => {
            setEmailDefaults({
              to: [cliente.email],
              subject: `Pedido #${pedidoData.numero || pedidoData.id?.slice(0, 8)} - ${brandName}`,
              body: '',
            });
            setEmailDialogOpen(true);
          }}
        >
          Enviar email personalizado
        </Button>
      </div>

      <SendEmailDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        defaultTo={emailDefaults.to}
        defaultSubject={emailDefaults.subject}
        defaultBody={emailDefaults.body}
        templates={getEmailTemplates(pedidoData, brandName)}
        onSend={handleSendEmail}
      />
    </>
  );
}

// Exported for use in header actions
export function PedidoQuickEmailButton({
  emails,
  onSendEmail,
  sending,
}: {
  emails: string[];
  onSendEmail: (email: string) => Promise<void>;
  sending: boolean;
}) {
  return (
    <ExpandableEmailButton
      emails={emails}
      onSendEmail={onSendEmail}
      sending={sending}
    />
  );
}
