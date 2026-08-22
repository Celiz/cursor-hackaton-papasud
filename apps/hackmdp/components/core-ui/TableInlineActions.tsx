"use client";

import { Button } from "@/components/ui/button";
import { Eye, Edit, Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TableInlineActionsProps<T = any> {
  row: T;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onCopy?: (row: T) => void;
  onDelete?: (row: T) => void;
  customActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    action: (row: T) => void;
    variant?: "default" | "destructive";
  }>;
}

/**
 * Componente reutilizable para acciones inline en filas de tabla
 * Se muestra solo al hacer hover sobre la fila (opacity-0 group-hover:opacity-100)
 *
 * Uso:
 * - La fila debe tener className="group"
 * - Este componente debe estar dentro de un TableCell
 *
 * Ejemplo:
 * ```tsx
 * <TableRow className="group">
 *   <TableCell>...</TableCell>
 *   <TableCell>
 *     <div className="flex items-center justify-end gap-1">
 *       {data}
 *       <TableInlineActions
 *         row={row}
 *         onView={handleView}
 *         onEdit={handleEdit}
 *       />
 *     </div>
 *   </TableCell>
 * </TableRow>
 * ```
 */
export function TableInlineActions<T = any>({
  row,
  onView,
  onEdit,
  onCopy,
  onDelete,
  customActions = [],
}: TableInlineActionsProps<T>) {
  const hasMoreActions = customActions.length > 0 || onDelete;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 0 }}
      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2"
    >
      {onView && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onView(row);
          }}
          className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      )}

      {onEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(row);
          }}
          className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Edit className="h-3.5 w-3.5" />
        </Button>
      )}

      {onCopy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(row);
          }}
          className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      )}

      {hasMoreActions && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            {customActions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  action.action(row);
                }}
                className={action.variant === "destructive" ? "text-red-600 dark:text-red-400" : ""}
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </DropdownMenuItem>
            ))}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(row);
                }}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </motion.div>
  );
}
