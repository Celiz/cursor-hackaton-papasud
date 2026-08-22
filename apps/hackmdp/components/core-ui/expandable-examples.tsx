"use client";

/**
 * EJEMPLOS DE USO DEL COMPONENTE ExpandableActionButton
 *
 * Este archivo contiene ejemplos de cómo usar el componente genérico
 * para diferentes casos de uso.
 *
 * NO IMPORTAR ESTE ARCHIVO EN PRODUCCIÓN - es solo documentación.
 */

import React, { useState } from "react";
import {
  Download,
  Share2,
  Trash2,
  Send,
  FileText,
  FileSpreadsheet,
  File,
  Copy,
  Link,
  QrCode,
  AlertTriangle,
} from "lucide-react";
import {
  ExpandableActionButton,
  ExpandableOptionsList,
  ExpandableActionsFooter,
  ExpandableActionBtn,
  ExpandableInputView,
} from "./ExpandableActionButton";

// ============================================================================
// EJEMPLO 1: Botón de exportar con múltiples formatos
// ============================================================================
export function ExportButtonExample() {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["pdf"]);
  const [loading, setLoading] = useState(false);

  const exportOptions = [
    { id: "pdf", label: "PDF", icon: <FileText className="h-3 w-3" /> },
    { id: "excel", label: "Excel", icon: <FileSpreadsheet className="h-3 w-3" /> },
    { id: "csv", label: "CSV", icon: <File className="h-3 w-3" /> },
  ];

  const handleExport = async () => {
    setLoading(true);
    // Simular exportación
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    console.log("Exportando:", selectedFormats);
  };

  return (
    <ExpandableActionButton
      icon={<Download className="h-4 w-4" />}
      title="Exportar"
      expandDirection="down"
      position="absolute" // No afecta layout, aparece como overlay
      expandedWidth={200}
    >
      <ExpandableOptionsList
        title="Formato:"
        options={exportOptions}
        selectedIds={selectedFormats}
        onToggle={(id) => setSelectedFormats(
          selectedFormats.includes(id)
            ? selectedFormats.filter(f => f !== id)
            : [...selectedFormats, id]
        )}
        multiSelect={true}
      />
      <ExpandableActionsFooter>
        <ExpandableActionBtn
          onClick={handleExport}
          loading={loading}
          disabled={selectedFormats.length === 0}
          icon={<Download className="h-3 w-3" />}
          label={`Exportar (${selectedFormats.length})`}
          variant="primary"
        />
      </ExpandableActionsFooter>
    </ExpandableActionButton>
  );
}

// ============================================================================
// EJEMPLO 2: Botón de compartir con opciones
// ============================================================================
export function ShareButtonExample() {
  const [view, setView] = useState<"options" | "link">("options");
  const [linkValue, setLinkValue] = useState("");

  const shareOptions = [
    { id: "copy", label: "Copiar enlace", icon: <Copy className="h-3 w-3" /> },
    { id: "email", label: "Enviar por email", icon: <Send className="h-3 w-3" /> },
    { id: "qr", label: "Código QR", icon: <QrCode className="h-3 w-3" /> },
  ];

  return (
    <ExpandableActionButton
      icon={<Share2 className="h-4 w-4" />}
      title="Compartir"
      expandDirection="down"
      position="inline" // Se expande inline, afecta layout (morphing)
      expandedWidth={260}
      variant="primary"
    >
      {view === "options" ? (
        <>
          <ExpandableOptionsList
            title="Compartir via:"
            options={shareOptions}
            selectedIds={[]}
            onToggle={(id) => {
              if (id === "copy") {
                navigator.clipboard.writeText(window.location.href);
              } else if (id === "email") {
                setView("link");
              }
            }}
            showCheckboxes={false}
          />
        </>
      ) : (
        <ExpandableInputView
          title="Enviar enlace a:"
          placeholder="email@ejemplo.com"
          value={linkValue}
          onChange={setLinkValue}
          onSubmit={() => console.log("Enviando a:", linkValue)}
          onBack={() => setView("options")}
          type="email"
          validate={(v) => v.includes("@")}
          submitLabel="Enviar"
          submitIcon={<Send className="h-4 w-4" />}
        />
      )}
    </ExpandableActionButton>
  );
}

// ============================================================================
// EJEMPLO 3: Botón de eliminar con confirmación inline
// ============================================================================
export function DeleteButtonExample() {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoading(false);
    console.log("Eliminado");
  };

  return (
    <ExpandableActionButton
      icon={<Trash2 className="h-4 w-4" />}
      title="Eliminar"
      expandDirection="down"
      position="absolute"
      expandedWidth={220}
      variant="danger"
    >
      <div className="p-3 space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              ¿Eliminar elemento?
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Esta acción no se puede deshacer
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExpandableActionBtn
            onClick={() => {}}
            label="Cancelar"
            variant="secondary"
          />
          <ExpandableActionBtn
            onClick={handleDelete}
            loading={loading}
            icon={<Trash2 className="h-3 w-3" />}
            label="Eliminar"
            variant="primary"
            className="!bg-red-500 hover:!bg-red-600"
          />
        </div>
      </div>
    </ExpandableActionButton>
  );
}

// ============================================================================
// EJEMPLO 4: Botón simple sin checkbox (lista de acciones)
// ============================================================================
export function QuickActionsExample() {
  const actions = [
    { id: "duplicate", label: "Duplicar", icon: <Copy className="h-3 w-3" /> },
    { id: "link", label: "Copiar enlace", icon: <Link className="h-3 w-3" /> },
    { id: "export", label: "Exportar PDF", icon: <FileText className="h-3 w-3" /> },
  ];

  return (
    <ExpandableActionButton
      icon={<span className="text-lg leading-none">⋮</span>}
      title="Más acciones"
      showExpandIndicator={false}
      expandDirection="down"
      position="absolute"
      expandedWidth={180}
    >
      <ExpandableOptionsList
        options={actions}
        selectedIds={[]}
        onToggle={(id) => console.log("Acción:", id)}
        showCheckboxes={false}
      />
    </ExpandableActionButton>
  );
}

// ============================================================================
// CASOS DE USO RECOMENDADOS
// ============================================================================
/**
 * CUÁNDO USAR position="inline" (Morphing):
 * - Botones en headers/toolbars donde hay espacio
 * - Cuando quieres que el botón "se transforme" visualmente
 * - Para acciones primarias que requieren input rápido
 * - Ejemplos: botón de email, botón de búsqueda
 *
 * CUÁNDO USAR position="absolute" (Overlay):
 * - Botones en tablas o listas donde el espacio es limitado
 * - Cuando no quieres afectar el layout circundante
 * - Para menús de acciones secundarias
 * - Ejemplos: exportar, compartir, más acciones (...)
 *
 * VARIANTES DE COLOR:
 * - default: acciones neutrales
 * - primary: acciones principales (compartir, enviar)
 * - success: acciones positivas (guardar, confirmar)
 * - warning: acciones que requieren atención
 * - danger: acciones destructivas (eliminar)
 *
 * DIRECCIONES DE EXPANSIÓN:
 * - down: default, ideal para botones en headers
 * - up: para botones en footers
 * - left/right: para botones en sidebars
 */
