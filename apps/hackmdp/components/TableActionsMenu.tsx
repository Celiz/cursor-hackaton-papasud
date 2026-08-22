"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, FileDown } from "lucide-react";

interface TableActionsMenuProps {
  onNew?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  newLabel?: string;
  hideNew?: boolean;
  hideExport?: boolean;
  selectedCount?: number;
}

export function TableActionsMenu({
  onExportExcel,
  onExportPDF,
  onExportCSV,
  hideExport = false,
  selectedCount,
}: TableActionsMenuProps) {
  const hasExportOptions = !hideExport && (onExportExcel || onExportPDF || onExportCSV);

  if (!hasExportOptions) return null;

  const hasSelection = selectedCount && selectedCount > 0;
  const subtitle = hasSelection
    ? `${selectedCount} fila${selectedCount > 1 ? 's' : ''} seleccionada${selectedCount > 1 ? 's' : ''}`
    : "Todas las filas visibles";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="outline" size="small" className="h-9 gap-1.5">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          {subtitle}
        </div>
        {onExportExcel && (
          <DropdownMenuItem onClick={onExportExcel}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
            Excel (.xlsx)
          </DropdownMenuItem>
        )}
        {onExportPDF && (
          <DropdownMenuItem onClick={onExportPDF}>
            <FileText className="mr-2 h-4 w-4 text-red-600" />
            PDF
          </DropdownMenuItem>
        )}
        {onExportCSV && (
          <DropdownMenuItem onClick={onExportCSV}>
            <FileDown className="mr-2 h-4 w-4 text-blue-600" />
            CSV
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
