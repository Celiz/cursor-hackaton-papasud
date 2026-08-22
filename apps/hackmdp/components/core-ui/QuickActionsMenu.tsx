"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Send, 
  Copy, 
  Archive,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Phone,
  Mail
} from "lucide-react";
import { Servicio } from "@/lib/types";
import { toast } from "sonner";

interface QuickActionsMenuProps {
  service: Servicio;
  onEdit?: (service: Servicio) => void;
  onDelete?: (service: Servicio) => void;
  onStatusChange?: (service: Servicio, newStatus: string) => void;
}

export function QuickActionsMenu({ 
  service, 
  onEdit, 
  onDelete, 
  onStatusChange 
}: QuickActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDuplicate = () => {
    toast.success("Servicio duplicado");
    setIsOpen(false);
  };

  const handleArchive = () => {
    toast.success("Servicio archivado");
    setIsOpen(false);
  };

  const handleSendNotification = () => {
    toast.success("Notificación enviada al cliente");
    setIsOpen(false);
  };

  const handleCallClient = () => {
    if (service.cliente_id?.datos_contacto?.telefono) {
      window.location.href = `tel:${service.cliente_id.datos_contacto.telefono}`;
    } else {
      toast.error("No hay teléfono registrado");
    }
  };

  const handleEmailClient = () => {
    if (service.cliente_id?.datos_contacto?.email) {
      window.location.href = `mailto:${service.cliente_id.datos_contacto.email}`;
    } else {
      toast.error("No hay email registrado");
    }
  };

  const quickStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(service, newStatus);
      toast.success(`Estado cambiado a: ${newStatus}`);
    }
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="outline" size="tiny" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Acciones Rápidas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Edit and Delete */}
        <DropdownMenuItem onClick={() => onEdit?.(service)}>
          <Edit className="mr-2 h-4 w-4" />
          <span>Editar servicio</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Duplicar</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Cambiar Estado
        </DropdownMenuLabel>
        
        {/* Quick Status Changes */}
        {service.estado !== "Listo/Reparado" && (
          <DropdownMenuItem onClick={() => quickStatusChange("Listo/Reparado")}>
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            <span>Marcar como Listo</span>
          </DropdownMenuItem>
        )}
        {service.estado !== "En reparación" && (
          <DropdownMenuItem onClick={() => quickStatusChange("En reparación")}>
            <Clock className="mr-2 h-4 w-4 text-yellow-600" />
            <span>En Reparación</span>
          </DropdownMenuItem>
        )}
        {service.estado !== "Entregar/Enviar" && (
          <DropdownMenuItem onClick={() => quickStatusChange("Entregar/Enviar")}>
            <Send className="mr-2 h-4 w-4 text-blue-600" />
            <span>Listo para Entregar</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Contactar Cliente
        </DropdownMenuLabel>
        
        {/* Client Contact */}
        <DropdownMenuItem onClick={handleCallClient}>
          <Phone className="mr-2 h-4 w-4" />
          <span>Llamar cliente</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEmailClient}>
          <Mail className="mr-2 h-4 w-4" />
          <span>Enviar email</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSendNotification}>
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Enviar notificación</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {/* Danger Zone */}
        <DropdownMenuItem onClick={handleArchive}>
          <Archive className="mr-2 h-4 w-4" />
          <span>Archivar</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onDelete?.(service)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Eliminar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}