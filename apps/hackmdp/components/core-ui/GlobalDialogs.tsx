"use client";

import { useDialogStore } from "@/lib/stores/dialog-store";
import { toast } from "sonner";

// Import create dialogs
import { CreateClienteDialog } from "@/components/core-ui/CreateClienteDialog";
import { PresupuestoFormDialog } from "@/components/core-ui/PresupuestoFormDialog";
import { OportunidadFormDialog } from "@/components/core-ui/OportunidadFormDialog";
import NuevaTareaDialog from "@/components/core-ui/NuevaTareaDialog";
import { FacturaFormDialog } from "@/components/core-ui/FacturaFormDialog";
import { CreateServicioDialog } from "@/components/core-ui/CreateServicioDialog";
import { CreateEquipoDialog } from "@/components/core-ui/CreateEquipoDialog";
import { CreateEquipoUnidadDialog } from "@/components/core-ui/CreateEquipoUnidadDialog";
import { ContratoFormDialog } from "@/components/core-ui/ContratoFormDialog";
import { IvrFormDialog } from "@/components/core-ui/IvrFormDialog";

// Types
import type { Cliente, Equipo, EquipoUnidad } from "@/lib/types";

export function GlobalDialogs() {
  const { openDialog, closeDialog } = useDialogStore();

  // Handler genérico para crear entidades
  const handleCreateCliente = async (data: Partial<Cliente>) => {
    const response = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Error al crear empresa');
    }

    toast.success('Empresa creada correctamente');
    closeDialog();
  };

  const handleCreateEquipo = async (data: Partial<Equipo>) => {
    const response = await fetch('/api/equipos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Error al crear equipo');
    }

    toast.success('Equipo creado correctamente');
    closeDialog();
  };

  const handleCreateEquipoUnidad = async (data: Partial<EquipoUnidad>) => {
    const response = await fetch('/api/equipos-unidades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Error al crear unidad de equipo');
    }

    toast.success('Unidad de equipo creada correctamente');
    closeDialog();
  };

  // Handler para servicios (usa onCreate)
  const handleCreateServicio = async (data: Record<string, unknown>) => {
    const response = await fetch('/api/servicios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Error al crear servicio');
    }

    toast.success('Servicio técnico creado correctamente');
    closeDialog();
  };

  // Handlers para diálogos con callback onSuccess
  const handleSuccess = () => {
    closeDialog();
  };

  return (
    <>
      {/* Cliente */}
      <CreateClienteDialog
        open={openDialog === 'cliente'}
        onOpenChange={(open) => !open && closeDialog()}
        onSave={handleCreateCliente}
      />

      {/* Presupuesto */}
      <PresupuestoFormDialog
        open={openDialog === 'presupuesto'}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={handleSuccess}
      />

      {/* Oportunidad */}
      <OportunidadFormDialog
        open={openDialog === 'oportunidad'}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={handleSuccess}
      />

      {/* Tarea */}
      <NuevaTareaDialog
        open={openDialog === 'tarea'}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={handleSuccess}
      />

      {/* Factura */}
      <FacturaFormDialog
        open={openDialog === 'factura'}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={handleSuccess}
      />

      {/* Servicio Técnico */}
      <CreateServicioDialog
        isOpen={openDialog === 'servicio'}
        onClose={closeDialog}
        onCreate={handleCreateServicio}
      />

      {/* Equipo */}
      <CreateEquipoDialog
        open={openDialog === 'equipo'}
        onOpenChange={(open) => !open && closeDialog()}
        onSave={handleCreateEquipo}
      />

      {/* Equipo Unidad */}
      <CreateEquipoUnidadDialog
        open={openDialog === 'equipo-unidad'}
        onOpenChange={(open) => !open && closeDialog()}
        onSave={handleCreateEquipoUnidad}
      />

      {/* Comodato/Contrato */}
      <ContratoFormDialog
        open={openDialog === 'comodato'}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={handleSuccess}
      />

      {/* IVR / Remito */}
      <IvrFormDialog
        open={openDialog === 'ivr'}
        onOpenChange={(open) => !open && closeDialog()}
        onSuccess={handleSuccess}
      />
    </>
  );
}
