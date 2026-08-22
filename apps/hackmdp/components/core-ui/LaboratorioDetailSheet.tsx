"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Laboratorio } from "@/lib/types/laboratorios";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  FileText,
  Users,
  Briefcase,
  Box,
  Wrench,
  User,
  FlaskConical,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AsociarContactoDialog } from "./AsociarContactoDialog";
import { ManageRazonesSocialesDialog } from "./ManageRazonesSocialesDialog";
import { Settings2 } from "lucide-react";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetItemCard,
  DetailSheetEmptyState,
  DetailSheetLoading,
  DetailSheetStatCard,
  DetailSheetInfoItem,
} from "./DetailSheetComponents";
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
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface LaboratorioDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laboratorio: Laboratorio;
  onLaboratorioUpdated?: () => void;
}

export function LaboratorioDetailSheet({
  open,
  onOpenChange,
  laboratorio,
  onLaboratorioUpdated,
}: LaboratorioDetailSheetProps) {
  const router = useRouter();
  const [showAsociarContactoDialog, setShowAsociarContactoDialog] = useState(false);
  const [showManageRazonesDialog, setShowManageRazonesDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/laboratorios?id=${laboratorio.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo eliminar el laboratorio");
      }
      toast.success("Laboratorio eliminado");
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onLaboratorioUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar laboratorio");
    } finally {
      setDeleting(false);
    }
  };

  // Fetch equipos ubicados en este laboratorio
  const { data: equiposData, isLoading: loadingEquipos } = useSWR(
    open && laboratorio?.id
      ? `/api/equipos-unidades?laboratorio_id=${laboratorio.id}`
      : null,
    fetcher
  );

  // Fetch contactos asociados al laboratorio
  const { data: contactosData, isLoading: loadingContactos, mutate: mutateContactos } = useSWR(
    open && laboratorio?.id
      ? `/api/personas-laboratorios?laboratorio_id=${laboratorio.id}`
      : null,
    fetcher
  );

  const equipos = Array.isArray(equiposData) ? equiposData : [];
  const [showAllEquipos, setShowAllEquipos] = useState(false);
  const contactos = Array.isArray(contactosData) ? contactosData : [];

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case "operativo":
        return "default";
      case "en_reparacion":
        return "destructive";
      case "en_mantenimiento":
        return "secondary";
      case "stock":
        return "outline";
      default:
        return "secondary";
    }
  };

  const navigateTo = (path: string) => {
    onOpenChange(false);
    setTimeout(() => router.push(path), 300);
  };

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="purple">
      <DetailSheetHeader
        icon={FlaskConical}
        title={laboratorio.nombre}
        theme="purple"
        subtitle={
          laboratorio.codigo && (
            <span className="text-xs font-mono font-medium">{laboratorio.codigo}</span>
          )
        }
        badges={
          <>
            {laboratorio.tipo && (
              <Badge variant="secondary" className="h-5 text-xs">
                {laboratorio.tipo}
              </Badge>
            )}
            <Badge
              variant={laboratorio.activo ? "default" : "secondary"}
              className={`h-5 text-xs ${laboratorio.activo ? "bg-green-500 hover:bg-green-600" : ""}`}
            >
              {laboratorio.activo ? "Activo" : "Inactivo"}
            </Badge>
          </>
        }
        onEdit={() => console.log("Edit")}
        onDelete={() => setShowDeleteConfirm(true)}
      />

      <DetailSheetContent>
        {/* Información de Contacto */}
        <DetailSheetSection icon={Mail} title="Información de Contacto" theme="purple">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {laboratorio.email && laboratorio.email.length > 0 && (
              <DetailSheetInfoItem
                icon={Mail}
                label="Email"
                theme="purple"
                value={
                  <div className="flex flex-wrap gap-1.5">
                    {laboratorio.email.map((email, index) => (
                      <a
                        key={index}
                        href={`mailto:${email}`}
                        className="text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        {email}
                      </a>
                    ))}
                  </div>
                }
              />
            )}

            {laboratorio.telefono && laboratorio.telefono.length > 0 && (
              <DetailSheetInfoItem
                icon={Phone}
                label="Teléfono"
                theme="emerald"
                value={
                  <div className="flex flex-wrap gap-1.5">
                    {laboratorio.telefono.map((tel, index) => (
                      <a
                        key={index}
                        href={`tel:${tel}`}
                        className="text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        {tel}
                      </a>
                    ))}
                  </div>
                }
              />
            )}

            {(laboratorio.direccion || laboratorio.localidad || laboratorio.provincia) && (
              <DetailSheetInfoItem
                icon={MapPin}
                label="Ubicación"
                theme="orange"
                value={
                  <>
                    {laboratorio.direccion}
                    {(laboratorio.localidad || laboratorio.provincia) && (
                      <span className="block text-[10px] text-muted-foreground">
                        {[laboratorio.localidad, laboratorio.provincia].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </>
                }
              />
            )}
          </div>
        </DetailSheetSection>

        {/* Razones Sociales (M:N — un laboratorio puede facturar a varias empresas) */}
        {(() => {
          // Preferir el array completo `razones_sociales` (viene de v_laboratorios_con_razones).
          // Fallback al legacy razon_social_id/nombre si la vista no devolvió el array.
          const razones = laboratorio.razones_sociales && laboratorio.razones_sociales.length > 0
            ? laboratorio.razones_sociales
            : (laboratorio.razon_social_id || laboratorio.razon_social_nombre)
              ? [{
                  cliente_id: laboratorio.razon_social?.id || laboratorio.razon_social_id || "",
                  nombre: laboratorio.razon_social?.nombre || laboratorio.razon_social_nombre || "",
                  cuit: laboratorio.razon_social_cuit || null,
                  es_principal: true,
                  ambito: null,
                  notas: null,
                }]
              : [];

          // Empty state: permitir agregar la primera razón social
          if (razones.length === 0) {
            return (
              <DetailSheetSection
                icon={Briefcase}
                title="Empresa facturadora"
                theme="blue"
                action={
                  <Button
                    type="outline"
                    size="tiny"
                    onClick={() => setShowManageRazonesDialog(true)}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Vincular
                  </Button>
                }
              >
                <DetailSheetEmptyState
                  icon={Briefcase}
                  message="Sin razón social vinculada — aún no hay empresa asociada para facturación"
                  actionLabel="Vincular empresa"
                  onAction={() => setShowManageRazonesDialog(true)}
                />
              </DetailSheetSection>
            );
          }

          return (
            <DetailSheetSection
              icon={Briefcase}
              title={razones.length > 1 ? "Empresas facturadoras" : "Empresa"}
              count={razones.length > 1 ? razones.length : undefined}
              theme="blue"
              action={
                <Button
                  type="outline"
                  size="tiny"
                  onClick={() => setShowManageRazonesDialog(true)}
                  className="gap-1"
                >
                  <Settings2 className="h-3 w-3" />
                  Gestionar
                </Button>
              }
            >
              <div className="space-y-2">
                {razones.map((rs) => {
                  const subtitleParts: string[] = [];
                  if (rs.cuit) subtitleParts.push(`CUIT: ${rs.cuit}`);
                  if (rs.es_principal && razones.length > 1) subtitleParts.push("Principal");
                  if (rs.ambito) subtitleParts.push(`Ámbito: ${rs.ambito}`);
                  return (
                    <DetailSheetItemCard
                      key={rs.cliente_id}
                      icon={Building2}
                      title={rs.nombre}
                      subtitle={subtitleParts.join(" · ") || undefined}
                      theme="blue"
                      onClick={() => {
                        if (rs.cliente_id) navigateTo(`/dashboard/empresas?id=${rs.cliente_id}`);
                      }}
                    />
                  );
                })}
              </div>
            </DetailSheetSection>
          );
        })()}

        {/* Equipos Ubicados */}
        <DetailSheetSection
          icon={Box}
          title="Equipos Ubicados"
          count={equipos.length}
          theme="teal"
          action={
            <Button
              type="outline"
              size="tiny"
              onClick={() => navigateTo(`/dashboard/equipos-unidades?laboratorio_id=${laboratorio.id}`)}
            >
              Ver todos
            </Button>
          }
        >
          {loadingEquipos ? (
            <DetailSheetLoading />
          ) : equipos.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {(showAllEquipos ? equipos : equipos.slice(0, 5)).map((equipo: any) => (
                <DetailSheetItemCard
                  key={equipo.id}
                  icon={Box}
                  title={`${equipo.equipos?.marca || ""} ${equipo.equipos?.modelo || ""}`}
                  subtitle={equipo.codigo || equipo.numero_serie || "Sin código"}
                  theme="teal"
                  badge={
                    <Badge
                      variant={getEstadoBadgeVariant(equipo.estado_general)}
                      className="text-[10px]"
                    >
                      {equipo.estado_general || "Sin estado"}
                    </Badge>
                  }
                  onClick={() => navigateTo(`/dashboard/equipos-unidades?id=${equipo.id}`)}
                />
              ))}
              {equipos.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllEquipos((v) => !v)}
                  className="w-full text-xs text-center text-teal-600 dark:text-teal-400 hover:underline pt-2"
                >
                  {showAllEquipos ? 'Ver menos' : `+${equipos.length - 5} equipos más`}
                </button>
              )}
            </div>
          ) : (
            <DetailSheetEmptyState
              icon={Box}
              message="No hay equipos ubicados en este laboratorio"
              actionLabel="Asignar equipo"
              onAction={() => navigateTo(`/dashboard/equipos-unidades?action=new&laboratorio_id=${laboratorio.id}`)}
            />
          )}
        </DetailSheetSection>

        {/* Contactos del Laboratorio */}
        <DetailSheetSection
          icon={Users}
          title="Contactos"
          count={contactos.length}
          theme="rose"
          action={
            <div className="flex items-center gap-2">
              <Button
                type="outline"
                size="tiny"
                onClick={() => setShowAsociarContactoDialog(true)}
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                type="outline"
                size="tiny"
                onClick={() => navigateTo(`/dashboard/personas?laboratorio_id=${laboratorio.id}`)}
              >
                Ver todos
              </Button>
            </div>
          }
        >
          {loadingContactos ? (
            <DetailSheetLoading />
          ) : contactos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {contactos.slice(0, 4).map((rel: any) => (
                <DetailSheetItemCard
                  key={rel.id}
                  icon={User}
                  title={rel.persona?.nombre_completo || ""}
                  subtitle={rel.persona?.cargo || rel.persona?.email?.[0]}
                  theme="rose"
                  badge={
                    rel.rol && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {rel.rol}
                      </Badge>
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <DetailSheetEmptyState
              icon={Users}
              message="No hay contactos asociados"
              actionLabel="Agregar contacto"
              onAction={() => setShowAsociarContactoDialog(true)}
            />
          )}
        </DetailSheetSection>

        {/* Resumen de Actividad */}
        <DetailSheetSection icon={Wrench} title="Resumen de Actividad" theme="amber">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DetailSheetStatCard
              value={equipos.length}
              label="Equipos ubicados"
              color="teal"
            />
            <DetailSheetStatCard
              value={contactos.length}
              label="Contactos"
              color="rose"
            />
            <DetailSheetStatCard
              value={equipos.filter((e: any) => e.estado_general === "operativo").length}
              label="Operativos"
              color="green"
            />
            <DetailSheetStatCard
              value={equipos.filter((e: any) => e.estado_general === "en_reparacion").length}
              label="En reparación"
              color="red"
            />
          </div>
        </DetailSheetSection>

        {/* Notas */}
        {laboratorio.notas && (
          <DetailSheetSection icon={FileText} title="Notas" theme="gray">
            <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-line">
              {laboratorio.notas}
            </div>
          </DetailSheetSection>
        )}
      </DetailSheetContent>

      {/* Diálogo de Asociar Contacto */}
      <AsociarContactoDialog
        open={showAsociarContactoDialog}
        onOpenChange={setShowAsociarContactoDialog}
        laboratorioId={laboratorio.id}
        laboratorioNombre={laboratorio.nombre}
        contactosExistentes={contactos.map((c: any) => c.persona_id)}
        onContactoAsociado={() => mutateContactos()}
      />

      {/* Diálogo de gestión M:N de razones sociales (migración 884) */}
      <ManageRazonesSocialesDialog
        laboratorioId={laboratorio.id}
        laboratorioNombre={laboratorio.nombre}
        open={showManageRazonesDialog}
        onOpenChange={setShowManageRazonesDialog}
        onChange={() => {
          // Pedirle al padre que refresque el laboratorio, así la vista
          // v_laboratorios_con_razones devuelve el array actualizado.
          onLaboratorioUpdated?.();
        }}
      />

      {/* Confirmación de borrado */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar laboratorio?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el laboratorio &quot;{laboratorio.nombre}&quot; y sus
              vínculos con razones sociales y contactos. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DetailSheetContainer>
  );
}
