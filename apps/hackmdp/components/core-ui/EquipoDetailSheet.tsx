"use client";

import { Equipo } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Calendar,
  Hash,
  FileText,
  Tag,
  Settings,
  Image as ImageIcon,
  Boxes,
} from "lucide-react";
import { safeFormat } from "@/lib/safe-date";
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetInfoItem,
} from "./DetailSheetComponents";
import { ShareToInternalChatButton } from './ShareToInternalChatButton';
import { EntidadRecursosSection } from "./EntidadRecursosSection";
import { EquipoInsumosSection } from "./EquipoInsumosSection";

interface EquipoDetailSheetProps {
  equipo: Equipo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (equipo: Equipo) => void;
  onDelete?: (equipo: Equipo) => void;
}

export function EquipoDetailSheet({
  equipo,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: EquipoDetailSheetProps) {
  if (!equipo) return null;

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="indigo">
      <DetailSheetHeader
        icon={Monitor}
        title={`${equipo.marca} ${equipo.modelo}`}
        theme="indigo"
        subtitle={
          <span className="text-xs font-mono">
            ID: {equipo.id?.slice(0, 8).toUpperCase() || "—"}
          </span>
        }
        badges={
          <>
            {equipo.tipo && (
              <Badge variant="outline" className="h-5 text-xs">
                {equipo.tipo}
              </Badge>
            )}
            {equipo.subtipo && (
              <Badge variant="secondary" className="h-5 text-xs">
                {equipo.subtipo}
              </Badge>
            )}
          </>
        }
        onEdit={onEdit ? () => onEdit(equipo) : undefined}
        onDelete={onDelete ? () => onDelete(equipo) : undefined}
        actions={
          <ShareToInternalChatButton
            entity={{
              type: 'equipo',
              id: equipo.id,
              label: `${equipo.marca} ${equipo.modelo}`,
              number: equipo.numero_serie || equipo.id.slice(0, 8),
              link: `/dashboard/equipos?id=${equipo.id}`,
            }}
            variant="icon"
          />
        }
      />

      <DetailSheetContent>
        {/* Información General */}
        <DetailSheetSection icon={Monitor} title="Información General" theme="indigo">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DetailSheetInfoItem
              icon={Tag}
              label="Marca"
              theme="indigo"
              value={equipo.marca || "—"}
            />
            <DetailSheetInfoItem
              icon={Hash}
              label="Modelo"
              theme="gray"
              value={<span className="font-mono">{equipo.modelo || "—"}</span>}
            />
            <DetailSheetInfoItem
              icon={Settings}
              label="Categoría"
              theme="purple"
              value={equipo.tipo || "—"}
            />
            {equipo.subtipo && (
              <DetailSheetInfoItem
                icon={FileText}
                label="Tipo"
                theme="blue"
                value={equipo.subtipo}
              />
            )}
          </div>

          {equipo.descripcion && (
            <div className="mt-3 text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {equipo.descripcion}
            </div>
          )}
        </DetailSheetSection>

        {/* Especificaciones Técnicas */}
        {equipo.especificaciones && Object.keys(equipo.especificaciones).length > 0 && (
          <DetailSheetSection icon={Settings} title="Especificaciones Técnicas" theme="purple">
            <div className="text-sm text-gray-700 dark:text-gray-300 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
              {typeof equipo.especificaciones === 'string' ? (
                <div className="whitespace-pre-line">{equipo.especificaciones}</div>
              ) : (
                Object.entries(equipo.especificaciones as Record<string, unknown>).map(([key, value]) => {
                  if (!value || (typeof value === 'object' && Object.keys(value as object).length === 0)) return null;
                  return (
                    <div key={key}>
                      <div className="font-medium text-gray-900 dark:text-gray-100 capitalize mb-1">
                        {key.replace(/_/g, ' ')}
                      </div>
                      {typeof value === 'string' ? (
                        <div className="whitespace-pre-line">{value}</div>
                      ) : typeof value === 'object' ? (
                        <div className="pl-3 space-y-1">
                          {Object.entries(value as Record<string, string>).map(([subKey, subValue]) => (
                            subValue && (
                              <div key={subKey} className="flex gap-2">
                                <span className="text-gray-500 capitalize">{subKey.replace(/_/g, ' ')}:</span>
                                <span>{String(subValue)}</span>
                              </div>
                            )
                          ))}
                        </div>
                      ) : (
                        <div>{String(value)}</div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </DetailSheetSection>
        )}

        {/* Imagen */}
        {equipo.imagen_url && (
          <DetailSheetSection icon={ImageIcon} title="Imagen del Equipo" theme="cyan">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <img
                src={equipo.imagen_url}
                alt={`${equipo.marca} ${equipo.modelo}`}
                className="max-h-48 object-contain mx-auto rounded-lg"
              />
            </div>
          </DetailSheetSection>
        )}

        {/* Insumos compatibles */}
        <DetailSheetSection icon={Boxes} title="Insumos compatibles" theme="emerald">
          <EquipoInsumosSection equipoId={equipo.id} />
        </DetailSheetSection>

        {/* Documentos */}
        <DetailSheetSection
          icon={FileText}
          title="Documentos"
          theme="blue"
        >
          <EntidadRecursosSection entidadTipo="equipo" entidadId={equipo.id} />
        </DetailSheetSection>

        {/* Timestamps */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-gray-200 dark:border-gray-800">
          {equipo.created_at && (
            <div className="flex justify-between">
              <span>Fecha de Registro:</span>
              <span>
                {safeFormat(equipo.created_at, "dd/MM/yyyy")}
              </span>
            </div>
          )}
          {equipo.updated_at && (
            <div className="flex justify-between">
              <span>Última Actualización:</span>
              <span>
                {safeFormat(equipo.updated_at, "dd/MM/yyyy")}
              </span>
            </div>
          )}
        </div>
      </DetailSheetContent>
    </DetailSheetContainer>
  );
}
