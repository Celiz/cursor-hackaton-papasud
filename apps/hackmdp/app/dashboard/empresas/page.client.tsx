'use client'
import { useState, useEffect, useRef, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { columnsClientes, empresasMobileConfig } from "./columns"
import { GenericDataTable } from "@/components/core-ui/GenericDataTable"
import { Input } from "@/components/ui/input"
import { LoadingLine } from "@/components/LoadingLine"
import useSWR from 'swr'
import { Cliente } from "@/lib/types"
import { CreateClienteDialog } from "@/components/core-ui/CreateClienteDialog"
import { EditClienteDialog } from "@/components/core-ui/EditClienteDialog"
import { ClienteDetailSheet } from "@/components/core-ui/ClienteDetailSheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { toast } from "sonner"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ClientesPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: clientes, error, isLoading, isValidating, mutate } = useSWR<Cliente[]>('/api/clientes?include_stats=true&view=principal', fetcher)

  // Buscador dedicado por N° de cliente (identificador_unico / CLI-legacy)
  const [numeroFiltro, setNumeroFiltro] = useState("")
  const clientesFiltrados = useMemo(() => {
    const q = numeroFiltro.trim()
    if (!q) return clientes
    return (clientes || []).filter((c: any) =>
      String(c.identificador_unico ?? "").startsWith(q) ||
      String(c.identificador_legacy ?? "").startsWith(q)
    )
  }, [clientes, numeroFiltro])

  // Opciones de los filtros facetados (client-side), calculadas de los clientes
  // ya cargados. Valores crudos (sin transformar) para que matcheen el filterFn
  // de cada columna. Tags por nombre (igual que el filterFn de la columna tags).
  const filterOptions = useMemo(() => {
    const locs = new Set<string>()
    const provs = new Set<string>()
    const tipos = new Set<string>()
    const tagNames = new Set<string>()
    for (const c of clientes || []) {
      if (c.localidad) locs.add(c.localidad)
      if (c.provincia) provs.add(c.provincia)
      if (c.tipo) tipos.add(c.tipo)
      ;(c.tags || []).forEach((t) => { if (t?.nombre) tagNames.add(t.nombre) })
    }
    const toOpts = (s: Set<string>) =>
      Array.from(s).sort((a, b) => a.localeCompare(b)).map((v) => ({ label: v, value: v }))
    return {
      localidad: toOpts(locs),
      provincia: toOpts(provs),
      tipo: toOpts(tipos),
      tags: toOpts(tagNames),
    }
  }, [clientes])

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const previousIdRef = useRef<string | null>(null)

  // Handle URL parameter to open specific cliente or action
  useEffect(() => {
    const clienteId = searchParams.get('id')
    const action = searchParams.get('action')

    // Handle ?action=new to open create dialog
    if (action === 'new') {
      setCreateDialogOpen(true)
      // Clean URL after opening
      router.replace('?', { scroll: false })
      return
    }

    // Only open if ID changed
    if (clienteId && clienteId !== previousIdRef.current && clientes && clientes.length > 0) {
      const cliente = clientes.find(c => c.id === clienteId)
      if (cliente) {
        setSelectedCliente(cliente)
        setDetailSheetOpen(true)
        previousIdRef.current = clienteId
      }
    } else if (!clienteId && previousIdRef.current) {
      // URL was cleared, reset ref
      previousIdRef.current = null
    }
  }, [searchParams, clientes, router])

  // --- Lógica para las acciones ---
  const handleCreate = () => {
    setCreateDialogOpen(true)
  }

  const handleSaveCreate = async (data: Partial<Cliente>) => {
    const createPromise = async () => {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Error al crear empresa')
      }

      mutate()
      return response
    }

    toast.promise(createPromise(), {
      loading: 'Creando empresa...',
      success: 'Empresa creada correctamente',
      error: 'No se pudo crear la empresa',
    })
  }

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async (data: Partial<Cliente>) => {
    if (!selectedCliente) return

    const editPromise = async () => {
      const response = await fetch(`/api/clientes/${selectedCliente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Error al actualizar empresa')
      }

      mutate()
      return response
    }

    toast.promise(editPromise(), {
      loading: 'Guardando cambios...',
      success: 'Empresa actualizada correctamente',
      error: 'No se pudo actualizar la empresa',
    })
  }

  const handleDelete = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!selectedCliente) return
    const deletedId = selectedCliente.id

    const deletePromise = async () => {
      const response = await fetch(`/api/clientes/${deletedId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar empresa')
      }

      mutate((current: any) => Array.isArray(current) ? current.filter((item: any) => item.id !== deletedId) : current, { revalidate: true })
      setDeleteDialogOpen(false)
      setSelectedCliente(null)
      return response
    }

    toast.promise(deletePromise(), {
      loading: 'Eliminando empresa...',
      success: 'Empresa eliminada correctamente',
      error: 'No se pudo eliminar la empresa',
    })
  }

  if (error) return <div>Failed to load</div>

  const handleRowClick = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setDetailSheetOpen(true)
    router.push(`?id=${cliente.id}`)
  }

  return (
    <>
      <div className="flex-1 flex flex-col overflow-y-hidden">
        <GenericDataTable
          columns={columnsClientes}
          data={clientesFiltrados || []}
          isLoading={isLoading}
          showTitle={false}
          pageTitle="Clientes"
          pageDescription="Gestiona los clientes y sus datos fiscales."
          searchColumnId="nombre"
          searchPlaceholder="Buscar por nombre, CUIT..."
          extraToolbarStart={
            <Input
              type="text"
              inputMode="numeric"
              placeholder="N° cliente"
              value={numeroFiltro}
              onChange={(e) => setNumeroFiltro(e.target.value.replace(/[^0-9]/g, ""))}
              className="h-9 w-[110px] text-sm"
            />
          }
          enableAutoFilters={false}
          facetedFilters={[
            { columnId: "localidad", title: "Localidad", options: filterOptions.localidad },
            { columnId: "provincia", title: "Provincia", options: filterOptions.provincia },
            { columnId: "tipo", title: "Tipo", options: filterOptions.tipo },
            ...(filterOptions.tags.length > 0
              ? [{ columnId: "tags", title: "Tags", options: filterOptions.tags }]
              : []),
          ]}
          initialColumnVisibility={{ provincia: false, tipo: false }}
          onNew={handleCreate}
          newLabel="Crear Cliente"
          onRowClick={handleRowClick}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={() => mutate()}
          refreshLoading={isValidating}
          mobileCardConfig={empresasMobileConfig}
        />
        <LoadingLine loading={isLoading} />
      </div>

      <CreateClienteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleSaveCreate}
      />

      {selectedCliente && (
        <EditClienteDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveEdit}
          cliente={selectedCliente}
        />
      )}

      <ClienteDetailSheet
        cliente={selectedCliente}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={(cliente) => {
          setDetailSheetOpen(false)
          handleEdit(cliente)
        }}
        onDelete={(cliente) => {
          setDetailSheetOpen(false)
          handleDelete(cliente)
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la empresa{" "}
              <strong>{selectedCliente?.nombre}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}