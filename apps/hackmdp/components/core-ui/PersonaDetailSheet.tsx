"use client";

import { useState, useMemo, useEffect } from "react";
import useSWR, { mutate as globalMutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Persona, PersonaFormData } from "@/lib/types/personas";
import {
  UserCircle,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  FileText,
  Building2,
  Users,
  FlaskConical,
  Hash,
  User,
  Plus,
  X,
  Loader2,
  Search,
  Check,
  Pencil,
  UserCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EditPersonaDialog } from "./EditPersonaDialog";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetItemCard,
  DetailSheetEmptyState,
  DetailSheetLoading,
  DetailSheetInfoItem,
} from "./DetailSheetComponents";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagBadges } from "@/components/core-ui/TagSelector"

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PersonaDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  persona: Persona;
  onPersonaUpdated?: () => void;
}

const tipoPersonaLabels: Record<string, string> = {
  contacto_ventas: "Contacto Ventas",
  bioquimico: "Bioquímico",
  veterinario: "Veterinario",
  tecnico: "Técnico",
  administrativo: "Administrativo",
  responsable_tecnico: "Responsable Técnico",
  otro: "Otro",
};

export function PersonaDetailSheet({
  open,
  onOpenChange,
  persona,
  onPersonaUpdated,
}: PersonaDetailSheetProps) {
  const router = useRouter();
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Estado para agregar laboratorio inline
  const [showLabSearch, setShowLabSearch] = useState(false);
  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [savingLab, setSavingLab] = useState(false);

  // Estado para asignar responsable inline
  const [showResponsableSearch, setShowResponsableSearch] = useState(false);
  const [responsableSearchQuery, setResponsableSearchQuery] = useState("");
  const [savingResponsable, setSavingResponsable] = useState(false);

  // Fetch laboratorios asociados
  const { data: laboratoriosData, isLoading: loadingLaboratorios, mutate: mutateLaboratorios } = useSWR(
    open && persona?.id
      ? `/api/personas-laboratorios?persona_id=${persona.id}`
      : null,
    fetcher
  );

  // Fetch todos los laboratorios para el buscador
  const { data: allLaboratorios, isLoading: loadingAllLabs } = useSWR<any[]>(
    showLabSearch ? "/api/laboratorios" : null,
    fetcher
  );

  // Fetch miembros del equipo para asignar responsable
  const { data: allTeamMembers, isLoading: loadingTeamMembers } = useSWR<any[]>(
    showResponsableSearch ? "/api/users" : null,
    fetcher
  );

  // Reset estado cuando se cierra el sheet
  useEffect(() => {
    if (!open) {
      setShowLabSearch(false);
      setLabSearchQuery("");
      setSelectedLabId(null);
      setShowResponsableSearch(false);
      setResponsableSearchQuery("");
    }
  }, [open]);

  // Fetch empresa/razón social
  const { data: empresaData, isLoading: loadingEmpresa } = useSWR(
    open && persona?.razon_social_id
      ? `/api/clientes/${persona.razon_social_id}`
      : null,
    fetcher
  );

  const laboratorios = Array.isArray(laboratoriosData) ? laboratoriosData : [];
  const empresa = empresaData && !empresaData.error ? empresaData : null;

  // IDs de laboratorios ya asociados
  const laboratoriosAsociadosIds = useMemo(() => {
    return laboratorios.map((rel: any) => rel.laboratorio_id);
  }, [laboratorios]);

  // Filtrar laboratorios disponibles (no asociados y que coincidan con búsqueda)
  const laboratoriosFiltrados = useMemo(() => {
    if (!allLaboratorios || !Array.isArray(allLaboratorios)) return [];
    let filtered = allLaboratorios.filter(
      (lab) => !laboratoriosAsociadosIds.includes(lab.id)
    );
    if (labSearchQuery.trim()) {
      const query = labSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (lab) =>
          lab.nombre?.toLowerCase().includes(query) ||
          lab.localidad?.toLowerCase().includes(query)
      );
    }
    return filtered.slice(0, 8); // Limitar resultados
  }, [allLaboratorios, laboratoriosAsociadosIds, labSearchQuery]);

  const navigateTo = (path: string) => {
    onOpenChange(false);
    setTimeout(() => router.push(path), 300);
  };

  // Agregar laboratorio a la persona
  const handleAsociarLaboratorio = async (labId: string) => {
    if (!persona?.id) return;

    setSavingLab(true);
    try {
      const res = await fetch("/api/personas-laboratorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona_id: persona.id,
          laboratorio_id: labId,
          activo: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al asociar laboratorio");
      }

      toast.success("Laboratorio asociado");
      mutateLaboratorios();
      onPersonaUpdated?.();
      setShowLabSearch(false);
      setLabSearchQuery("");
      setSelectedLabId(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingLab(false);
    }
  };

  // Eliminar asociación de laboratorio
  const handleDesvincularLaboratorio = async (relId: string) => {
    if (!confirm("¿Desvincular este laboratorio?")) return;

    try {
      const res = await fetch(`/api/personas-laboratorios?id=${relId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al desvincular");
      }

      toast.success("Laboratorio desvinculado");
      mutateLaboratorios();
      onPersonaUpdated?.();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Filtrar miembros del equipo para el buscador de responsable
  const teamMembersFiltrados = useMemo(() => {
    if (!allTeamMembers || !Array.isArray(allTeamMembers)) return [];
    let filtered = allTeamMembers;
    if (responsableSearchQuery.trim()) {
      const q = responsableSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.nombre?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q)
      );
    }
    return filtered.slice(0, 8);
  }, [allTeamMembers, responsableSearchQuery]);

  // Asignar responsable
  const handleAsignarResponsable = async (userId: string) => {
    if (!persona?.id) return;

    setSavingResponsable(true);
    try {
      const res = await fetch("/api/crm/contactos/asignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona_id: persona.id,
          usuario_asignado_id: userId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al asignar responsable");
      }

      toast.success("Responsable asignado");
      onPersonaUpdated?.();
      setShowResponsableSearch(false);
      setResponsableSearchQuery("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingResponsable(false);
    }
  };

  // Quitar responsable
  const handleQuitarResponsable = async () => {
    if (!persona?.id) return;

    setSavingResponsable(true);
    try {
      const res = await fetch("/api/crm/contactos/asignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona_id: persona.id,
          usuario_asignado_id: null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al quitar responsable");
      }

      toast.success("Responsable removido");
      onPersonaUpdated?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSavingResponsable(false);
    }
  };

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="violet">
      <DetailSheetHeader
        icon={UserCircle}
        title={persona.nombre_completo || `${persona.nombre || ""} ${persona.apellido || ""}`}
        theme="violet"
        subtitle={
          persona.cargo && (
            <span className="text-xs text-muted-foreground">{persona.cargo}</span>
          )
        }
        badges={
          <>
            {persona.tipo_persona && (
              <Badge variant="secondary" className="h-5 text-xs">
                {tipoPersonaLabels[persona.tipo_persona] || persona.tipo_persona}
              </Badge>
            )}
            <Badge
              variant={persona.activo ? "default" : "secondary"}
              className={`h-5 text-xs ${persona.activo ? "bg-green-500 hover:bg-green-600" : ""}`}
            >
              {persona.activo ? "Activo" : "Inactivo"}
            </Badge>
          </>
        }
        onEdit={() => setShowEditDialog(true)}
        onDelete={() => console.log("Delete")}
      />

      <DetailSheetContent>
        {/* Datos Personales */}
        <DetailSheetSection icon={UserCircle} title="Datos Personales" theme="violet">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {persona.nombre && (
              <DetailSheetInfoItem
                icon={User}
                label="Nombre"
                theme="violet"
                value={persona.nombre}
              />
            )}
            {persona.apellido && (
              <DetailSheetInfoItem
                icon={User}
                label="Apellido"
                theme="violet"
                value={persona.apellido}
              />
            )}
            {persona.dni && (
              <DetailSheetInfoItem
                icon={Hash}
                label="DNI"
                theme="gray"
                value={<span className="font-mono">{persona.dni}</span>}
              />
            )}
            {persona.cargo && (
              <DetailSheetInfoItem
                icon={Briefcase}
                label="Cargo"
                theme="blue"
                value={persona.cargo}
              />
            )}
          </div>
        </DetailSheetSection>

        {/* Información de Contacto */}
        {((persona.email && persona.email.length > 0) ||
          (persona.telefono && persona.telefono.length > 0)) && (
          <DetailSheetSection icon={Phone} title="Información de Contacto" theme="teal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {persona.email && persona.email.length > 0 && (
                <DetailSheetInfoItem
                  icon={Mail}
                  label="Email"
                  theme="teal"
                  value={
                    <div className="space-y-1">
                      {persona.email.map((email, idx) => (
                        <a
                          key={idx}
                          href={`mailto:${email}`}
                          className="block text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          {email}
                        </a>
                      ))}
                    </div>
                  }
                />
              )}
              {persona.telefono && persona.telefono.length > 0 && (
                <DetailSheetInfoItem
                  icon={Phone}
                  label="Teléfono"
                  theme="emerald"
                  value={
                    <div className="space-y-1">
                      {persona.telefono.map((tel, idx) => (
                        <a
                          key={idx}
                          href={`tel:${tel}`}
                          className="block text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          {tel}
                        </a>
                      ))}
                    </div>
                  }
                />
              )}
            </div>
          </DetailSheetSection>
        )}

        {/* Información Profesional */}
        {(persona.profesion || persona.matricula_profesional) && (
          <DetailSheetSection icon={Briefcase} title="Información Profesional" theme="blue">
            <div className="grid grid-cols-2 gap-3">
              {persona.profesion && (
                <DetailSheetInfoItem
                  icon={Briefcase}
                  label="Profesión"
                  theme="blue"
                  value={persona.profesion}
                />
              )}
              {persona.matricula_profesional && (
                <DetailSheetInfoItem
                  icon={Hash}
                  label="Matrícula Profesional"
                  theme="blue"
                  value={<span className="font-mono">{persona.matricula_profesional}</span>}
                />
              )}
            </div>
          </DetailSheetSection>
        )}

        {/* Clasificación */}
        {(persona.categoria || persona.ubicacion) && (
          <DetailSheetSection icon={MapPin} title="Clasificación" theme="amber">
            <div className="grid grid-cols-2 gap-3">
              {persona.categoria && (
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-500/10 dark:bg-amber-500/20">
                    <MapPin className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Categoría</p>
                    <Badge
                      variant="secondary"
                      className="mt-1"
                      style={{
                        backgroundColor: persona.categoria.color
                          ? `${persona.categoria.color}20`
                          : undefined,
                      }}
                    >
                      {persona.categoria.nombre}
                    </Badge>
                  </div>
                </div>
              )}
              {persona.ubicacion && (
                <DetailSheetInfoItem
                  icon={MapPin}
                  label="Ubicación"
                  theme="amber"
                  value={persona.ubicacion.nombre}
                />
              )}
            </div>
          </DetailSheetSection>
        )}

        {/* Tags */}
        {(persona as any).tags && (persona as any).tags.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Tags</p>
            <TagBadges tags={(persona as any).tags} />
          </div>
        )}

        {/* Responsable de Ventas */}
        <DetailSheetSection
          icon={UserCheck}
          title="Responsable de Ventas"
          theme="cyan"
          action={
            <Button
              type="text"
              size="tiny"
              className="h-6 text-xs gap-1 text-cyan-600"
              onClick={() => setShowResponsableSearch(true)}
            >
              {persona.responsable?.id ? (
                <>
                  <Pencil className="h-3 w-3" />
                  Reasignar
                </>
              ) : (
                <>
                  <Plus className="h-3 w-3" />
                  Asignar
                </>
              )}
            </Button>
          }
        >
          {/* Panel inline para buscar y asignar responsable */}
          {showResponsableSearch && (
            <div className="mb-3 p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-cyan-500" />
                <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Buscar miembro del equipo</span>
              </div>
              <Input
                value={responsableSearchQuery}
                onChange={(e) => setResponsableSearchQuery(e.target.value)}
                placeholder="Buscar por nombre..."
                className="h-8 text-sm mb-2"
                autoFocus
              />

              <ScrollArea className="max-h-[200px]">
                {loadingTeamMembers ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-500" />
                  </div>
                ) : teamMembersFiltrados.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    {responsableSearchQuery ? "Sin resultados" : "Escribe para buscar"}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {teamMembersFiltrados.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => handleAsignarResponsable(member.id)}
                        className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-colors"
                      >
                        <div className="h-7 w-7 rounded-full bg-cyan-200 dark:bg-cyan-800 flex items-center justify-center text-xs font-bold text-cyan-700 dark:text-cyan-300">
                          {(member.nombre?.[0] || member.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.nombre}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                        {savingResponsable ? (
                          <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                        ) : (
                          <Check className="h-4 w-4 text-cyan-500" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-end mt-2 pt-2 border-t border-cyan-200 dark:border-cyan-700">
                <Button
                  type="text"
                  size="tiny"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowResponsableSearch(false);
                    setResponsableSearchQuery("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {persona.responsable?.id ? (
            <div className="group relative flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="h-9 w-9 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-sm font-bold text-cyan-700 dark:text-cyan-300">
                {(persona.responsable.nombre?.[0] || "").toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{persona.responsable.nombre_completo}</p>
                <p className="text-xs text-muted-foreground">Responsable asignado</p>
              </div>
              <Button
                type="text"
                size="tiny"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={handleQuitarResponsable}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : !showResponsableSearch && (
            <DetailSheetEmptyState
              icon={UserCheck}
              message="Sin responsable asignado"
              actionLabel="Asignar responsable"
              onAction={() => setShowResponsableSearch(true)}
            />
          )}
        </DetailSheetSection>

        {/* Empresa */}
        {(empresa || persona.razon_social_id) && (
          <DetailSheetSection
            icon={Building2}
            title="Empresa"
            theme="indigo"
            action={
              persona.razon_social_id && (
                <Button
                  type="outline"
                  size="tiny"
                  onClick={() => navigateTo(`/dashboard/empresas?id=${persona.razon_social_id}`)}
                >
                  Ver empresa
                </Button>
              )
            }
          >
            {loadingEmpresa ? (
              <DetailSheetLoading />
            ) : empresa ? (
              <DetailSheetItemCard
                icon={Building2}
                title={empresa.nombre || empresa.razon_social || ""}
                subtitle={empresa.cuit ? `CUIT: ${empresa.cuit}` : undefined}
                theme="indigo"
                onClick={() => navigateTo(`/dashboard/empresas?id=${persona.razon_social_id}`)}
              />
            ) : (
              <DetailSheetEmptyState
                icon={Building2}
                message="No hay empresa asociada"
              />
            )}
          </DetailSheetSection>
        )}

        {/* Laboratorios */}
        <DetailSheetSection
          icon={FlaskConical}
          title="Laboratorios"
          count={laboratorios.length}
          theme="purple"
          action={
            <div className="flex items-center gap-1">
              {!showLabSearch && (
                <Button
                  type="text"
                  size="tiny"
                  className="h-6 text-xs gap-1 text-purple-600"
                  onClick={() => setShowLabSearch(true)}
                >
                  <Plus className="h-3 w-3" />
                  Agregar
                </Button>
              )}
              {laboratorios.length > 0 && (
                <Button
                  type="outline"
                  size="tiny"
                  onClick={() => navigateTo(`/dashboard/laboratorios?persona_id=${persona.id}`)}
                >
                  Ver todos
                </Button>
              )}
            </div>
          }
        >
          {/* Panel inline para buscar y agregar laboratorio */}
          {showLabSearch && (
            <div className="mb-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Buscar laboratorio</span>
              </div>
              <Input
                value={labSearchQuery}
                onChange={(e) => setLabSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o localidad..."
                className="h-8 text-sm mb-2"
                autoFocus
              />

              {/* Resultados de búsqueda */}
              <ScrollArea className="max-h-[200px]">
                {loadingAllLabs ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                  </div>
                ) : laboratoriosFiltrados.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    {labSearchQuery ? "Sin resultados" : "Escribe para buscar"}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {laboratoriosFiltrados.map((lab) => (
                      <div
                        key={lab.id}
                        onClick={() => handleAsociarLaboratorio(lab.id)}
                        className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                      >
                        <div className="p-1.5 rounded bg-purple-200 dark:bg-purple-800">
                          <FlaskConical className="h-3.5 w-3.5 text-purple-600 dark:text-purple-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{lab.nombre}</p>
                          {lab.localidad && (
                            <p className="text-xs text-muted-foreground">{lab.localidad}</p>
                          )}
                        </div>
                        {savingLab ? (
                          <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                        ) : (
                          <Plus className="h-4 w-4 text-purple-500" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-end mt-2 pt-2 border-t border-purple-200 dark:border-purple-700">
                <Button
                  type="text"
                  size="tiny"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowLabSearch(false);
                    setLabSearchQuery("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {loadingLaboratorios ? (
            <DetailSheetLoading />
          ) : laboratorios.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {laboratorios.slice(0, 4).map((rel: any) => (
                <div
                  key={rel.id}
                  className="group relative flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors cursor-pointer"
                  onClick={() => navigateTo(`/dashboard/laboratorios?id=${rel.laboratorio_id}`)}
                >
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <FlaskConical className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rel.laboratorio?.nombre || ""}</p>
                    {(rel.laboratorio?.localidad || rel.rol) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {rel.laboratorio?.localidad || rel.rol}
                      </p>
                    )}
                  </div>
                  {rel.rol && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {rel.rol}
                    </Badge>
                  )}
                  {/* Botón desvincular */}
                  <Button
                    type="text"
                    size="tiny"
                    className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDesvincularLaboratorio(rel.id);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : !showLabSearch && (
            <DetailSheetEmptyState
              icon={FlaskConical}
              message="No hay laboratorios asociados"
              actionLabel="Asociar laboratorio"
              onAction={() => setShowLabSearch(true)}
            />
          )}
        </DetailSheetSection>

        {/* Notas */}
        {persona.notas && (
          <DetailSheetSection icon={FileText} title="Notas" theme="gray">
            <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-line">
              {persona.notas}
            </div>
          </DetailSheetSection>
        )}
      </DetailSheetContent>

      {/* Diálogo de Edición */}
      <EditPersonaDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        persona={persona}
        onSave={async (data) => {
          const res = await fetch("/api/personas", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.details || errorData.error || "Error al actualizar");
          }
          onPersonaUpdated?.();
        }}
      />
    </DetailSheetContainer>
  );
}
