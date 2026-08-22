"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  Smartphone,
  QrCode,
  CheckCircle,
  XCircle,
  Unplug,
} from "lucide-react";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "Error al cargar datos");
  return data;
};

interface SessionStatus {
  status: "disconnected" | "connecting" | "connected";
  phone: string | null;
  hasQr: boolean;
  linked_at: string | null;
}

interface QrData {
  qrDataUrl: string | null;
}

export default function WhatsAppPageClient() {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const [polling, setPolling] = useState(false);

  const { data: session, error, isLoading, mutate } = useSWR<SessionStatus>(
    "/api/wa-bridge/session",
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: polling ? 3000 : 0,
    }
  );

  const { data: qrData } = useSWR<QrData>(
    session?.status === "connecting" ? "/api/wa-bridge/session/qr" : null,
    fetcher,
    { refreshInterval: 3000 }
  );

  // Manage polling: poll while connecting, stop when connected
  useEffect(() => {
    if (session?.status === "connecting") {
      setPolling(true);
    } else if (session?.status === "connected") {
      if (polling) {
        toast.success("WhatsApp vinculado correctamente");
      }
      setPolling(false);
      setConnecting(false);
    } else {
      setPolling(false);
    }
  }, [session?.status]);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setPolling(true);
    try {
      const res = await fetch("/api/wa-bridge/session", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al conectar");
      }
      mutate();
    } catch (error: any) {
      toast.error(error.message);
      setConnecting(false);
      setPolling(false);
    }
  }, [mutate]);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/wa-bridge/session", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al desconectar");
      }
      mutate();
      toast.success("WhatsApp desvinculado");
      setShowDisconnectDialog(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDisconnecting(false);
    }
  }, [mutate]);

  const status = session?.status || "disconnected";

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/configuracion"
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </Link>
        <div className="p-3 rounded-2xl bg-green-100 dark:bg-green-900/30">
          <Smartphone className="h-7 w-7 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            WhatsApp Bridge
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Vinculá tu WhatsApp personal para enviar presupuestos como PDF
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Error al cargar estado de WhatsApp</p>
            <p className="text-xs text-red-400 mt-1">{error.message}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Estado de conexión
                    <Badge
                      variant={
                        status === "connected"
                          ? "success"
                          : status === "connecting"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {status === "connected"
                        ? "Conectado"
                        : status === "connecting"
                        ? "Conectando..."
                        : "Desconectado"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {status === "connected"
                      ? `Vinculado al número ${session?.phone || "..."}`
                      : status === "connecting"
                      ? "Escaneá el código QR con tu WhatsApp"
                      : "Vinculá tu WhatsApp para enviar documentos desde Locus"}
                  </CardDescription>
                </div>
                {status === "connected" && (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                )}
              </div>
            </CardHeader>

            <CardContent>
              {/* Disconnected — Show connect button */}
              {status === "disconnected" && (
                <div className="text-center py-6 space-y-4">
                  <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 inline-block">
                    <QrCode className="h-12 w-12 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Al vincular, podrás enviar presupuestos como PDF directamente desde tu
                      número de WhatsApp personal.
                    </p>
                    <Button
                      type="primary"
                      onClick={handleConnect}
                      disabled={connecting}
                      className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <Smartphone className="h-4 w-4 mr-2" />
                          Vincular WhatsApp
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Connecting — Show QR */}
              {status === "connecting" && (
                <div className="text-center py-4 space-y-4">
                  {qrData?.qrDataUrl ? (
                    <div className="space-y-3">
                      <div className="bg-white rounded-xl p-4 inline-block shadow-sm border">
                        <img
                          src={qrData.qrDataUrl}
                          alt="QR WhatsApp"
                          className="w-64 h-64"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Escaneá este QR desde tu WhatsApp
                        </p>
                        <p className="text-xs text-gray-500">
                          WhatsApp &gt; Dispositivos vinculados &gt; Vincular dispositivo
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto" />
                      <p className="text-sm text-gray-500">Generando código QR...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Connected — Show info + disconnect */}
              {status === "connected" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/40">
                      <Smartphone className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {session?.phone ? `+${session.phone}` : "Número vinculado"}
                      </p>
                      {session?.linked_at && (
                        <p className="text-xs text-gray-500">
                          Vinculado el{" "}
                          {new Date(session.linked_at).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setShowDisconnectDialog(true)}
                      className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
                    >
                      <Unplug className="h-4 w-4" />
                      Desvincular WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          {status === "connected" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cómo enviar un presupuesto</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li className="flex gap-2">
                    <span className="font-medium text-green-600">1.</span>
                    Abrí un presupuesto desde el listado
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-green-600">2.</span>
                    Tocá el dropdown de Mail y elegí &quot;Enviar por WhatsApp&quot;
                  </li>
                  <li className="flex gap-2">
                    <span className="font-medium text-green-600">3.</span>
                    Confirmá el teléfono del cliente y enviá el PDF
                  </li>
                </ol>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Disconnect confirmation dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Unplug className="h-5 w-5 text-red-500" />
              Desvincular WhatsApp
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se cerrará la sesión de WhatsApp. Para volver a enviar presupuestos por WhatsApp,
              tendrás que escanear el QR de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="bg-red-600 hover:bg-red-700"
            >
              {disconnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Desvinculando...
                </>
              ) : (
                "Desvincular"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
