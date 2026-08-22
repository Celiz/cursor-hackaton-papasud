'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { EquipoCatalogo, DivisionCatalogo, ProductoCatalogo } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import {
  Box,
  Tag,
  Package,
  Settings,
  Eye,
  EyeOff,
  Calendar,
  Layers,
  Info,
  FileText,
  Image as ImageIcon,
  Cpu,
  Building2,
  Link2,
  Hash,
  ExternalLink,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  DetailSheetContainer,
  DetailSheetHeader,
  DetailSheetContent,
  DetailSheetSection,
  DetailSheetInfoItem,
  DetailSheetItemCard,
  DetailSheetEmptyState,
} from './DetailSheetComponents'
import { DivisionBadges } from './DivisionMultiSelect'
import { EspecificacionesDisplay } from './EspecificacionesEditor'
import { cn } from '@/lib/utils'

interface EquipoCatalogoDetailSheetProps {
  equipo: EquipoCatalogo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
  onDelete?: () => void
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function EquipoCatalogoDetailSheet({
  equipo,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: EquipoCatalogoDetailSheetProps) {
  // Fetch equipo con productos relacionados
  const { data: equipoConProductos } = useSWR<{
    equipo: EquipoCatalogo
    productos: ProductoCatalogo[]
  }>(
    equipo && open ? `/api/catalogo-web/equipos/${equipo.id}` : null,
    fetcher
  )

  const productos = equipoConProductos?.productos || equipo?.productos || []

  // Contar especificaciones
  const specsCount = useMemo(() => {
    if (!equipo?.especificaciones) return 0
    return Object.keys(equipo.especificaciones).length
  }, [equipo?.especificaciones])

  if (!equipo) return null

  return (
    <DetailSheetContainer open={open} onOpenChange={onOpenChange} theme="purple">
      <DetailSheetHeader
        icon={Box}
        title={`${equipo.marca} ${equipo.modelo}`}
        theme="purple"
        subtitle={
          <span className="text-xs font-mono">
            ID: {equipo.id?.slice(0, 8).toUpperCase() || '—'}
          </span>
        }
        badges={
          <>
            <Badge variant="outline" className="h-5 text-xs border-purple-300 text-purple-700">
              {equipo.tipo}
            </Badge>
            {equipo.subtipo && (
              <Badge variant="secondary" className="h-5 text-xs bg-purple-100/50 text-purple-700">
                <Tag className="h-3 w-3 mr-1" />
                {equipo.subtipo}
              </Badge>
            )}
            <Badge
              className={cn(
                'h-5 text-xs gap-1',
                equipo.disponible
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-red-100 text-red-700 border-red-200'
              )}
            >
              {equipo.disponible ? (
                <><Eye className="h-3 w-3" />Visible</>
              ) : (
                <><EyeOff className="h-3 w-3" />Oculto</>
              )}
            </Badge>
          </>
        }
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <DetailSheetContent>
        {/* Información General */}
        <DetailSheetSection icon={Info} title="Información General" theme="purple">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DetailSheetInfoItem
              icon={Tag}
              label="Marca"
              theme="purple"
              value={equipo.marca || '—'}
            />
            <DetailSheetInfoItem
              icon={Hash}
              label="Modelo"
              theme="gray"
              value={<span className="font-mono">{equipo.modelo || '—'}</span>}
            />
            <DetailSheetInfoItem
              icon={Settings}
              label="Categoría"
              theme="indigo"
              value={<span className="uppercase">{equipo.tipo || '—'}</span>}
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
        </DetailSheetSection>

        {/* Utilidad */}
        {equipo.utilidad && (
          <DetailSheetSection icon={Settings} title="Utilidad" theme="emerald">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {equipo.utilidad}
            </div>
          </DetailSheetSection>
        )}

        {/* Descripción */}
        {equipo.detalle && (
          <DetailSheetSection icon={FileText} title="Descripción" theme="gray">
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {equipo.detalle}
            </div>
          </DetailSheetSection>
        )}

        {/* Divisiones */}
        {equipo.division && equipo.division.length > 0 && (
          <DetailSheetSection
            icon={Layers}
            title="Divisiones"
            count={equipo.division.length}
            theme="blue"
          >
            <DivisionBadges divisions={equipo.division as DivisionCatalogo[]} />
          </DetailSheetSection>
        )}

        {/* Especificaciones Técnicas */}
        <DetailSheetSection
          icon={Cpu}
          title="Especificaciones Técnicas"
          count={specsCount > 0 ? specsCount : undefined}
          theme="indigo"
        >
          {specsCount > 0 ? (
            <EspecificacionesDisplay value={equipo.especificaciones} />
          ) : (
            <DetailSheetEmptyState
              icon={Cpu}
              message="No hay especificaciones técnicas definidas"
              actionLabel={onEdit ? "Agregar especificaciones" : undefined}
              onAction={onEdit}
            />
          )}
        </DetailSheetSection>

        {/* Productos Relacionados */}
        <DetailSheetSection
          icon={Package}
          title="Productos Relacionados"
          count={productos.length > 0 ? productos.length : undefined}
          theme="emerald"
        >
          {productos.length > 0 ? (
            <div className="space-y-2">
              {productos.map((producto) => (
                <DetailSheetItemCard
                  key={producto.id}
                  icon={Package}
                  title={producto.nombre}
                  subtitle={producto.codigo || undefined}
                  theme="emerald"
                  badge={
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        producto.tipo === 'insumo' && 'border-blue-300 text-blue-700 bg-blue-50',
                        producto.tipo === 'accesorio' && 'border-emerald-300 text-emerald-700 bg-emerald-50',
                        producto.tipo === 'repuesto' && 'border-orange-300 text-orange-700 bg-orange-50'
                      )}
                    >
                      {producto.tipo}
                    </Badge>
                  }
                />
              ))}
            </div>
          ) : (
            <DetailSheetEmptyState
              icon={Package}
              message="No hay productos relacionados con este equipo"
            />
          )}
        </DetailSheetSection>

        {/* Imagen */}
        <DetailSheetSection icon={ImageIcon} title="Imagen del Equipo" theme="cyan">
          {equipo.imagen_url ? (
            <div className="space-y-3">
              <div className="relative group">
                <img
                  src={equipo.imagen_url}
                  alt={`${equipo.marca} ${equipo.modelo}`}
                  className="w-full max-w-md mx-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white shadow-lg"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-xl transition-colors flex items-center justify-center">
                  <a
                    href={equipo.imagen_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-md flex items-center gap-2 text-sm font-medium"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver original
                  </a>
                </div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  URL de la imagen:
                </p>
                <code className="text-xs text-gray-700 dark:text-gray-300 break-all block bg-gray-100 dark:bg-gray-800 p-2 rounded">
                  {equipo.imagen_url}
                </code>
              </div>
            </div>
          ) : (
            <DetailSheetEmptyState
              icon={ImageIcon}
              message="No hay imagen configurada para este equipo"
              actionLabel={onEdit ? "Agregar imagen" : undefined}
              onAction={onEdit}
            />
          )}
        </DetailSheetSection>

        {/* Fabricante */}
        {equipo.empresa && (
          <DetailSheetSection icon={Building2} title="Fabricante" theme="orange">
            <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {equipo.empresa.logo_url ? (
                <img
                  src={equipo.empresa.logo_url}
                  alt={equipo.empresa.nombre}
                  className="h-12 w-12 rounded-lg object-contain bg-white border shadow-sm"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-orange-600" />
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {equipo.empresa.nombre}
                </p>
                {equipo.empresa.sitio_web && (
                  <a
                    href={equipo.empresa.sitio_web}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-0.5"
                  >
                    <Link2 className="h-3 w-3" />
                    {equipo.empresa.sitio_web.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
          </DetailSheetSection>
        )}

        {/* Metadatos */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-between">
            <span>ID:</span>
            <span className="font-mono">{equipo.id}</span>
          </div>
          <div className="flex justify-between">
            <span>Orden:</span>
            <span>{equipo.orden}</span>
          </div>
          {equipo.created_at && (
            <div className="flex justify-between">
              <span>Creado:</span>
              <span>{format(new Date(equipo.created_at), "dd/MM/yyyy", { locale: es })}</span>
            </div>
          )}
          {equipo.updated_at && (
            <div className="flex justify-between">
              <span>Actualizado:</span>
              <span>{format(new Date(equipo.updated_at), "dd/MM/yyyy", { locale: es })}</span>
            </div>
          )}
        </div>
      </DetailSheetContent>
    </DetailSheetContainer>
  )
}
