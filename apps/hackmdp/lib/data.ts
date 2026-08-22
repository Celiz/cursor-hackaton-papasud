import { CheckCircle, AlertCircle, Clock, CheckCircle2, Truck, Info, CircleCheckBig, ArrowUpIcon, ArrowDownIcon, Wrench, Package, Send, Ban, FileText, CircleDashed, type LucideIcon } from 'lucide-react';
import { BsCash } from 'react-icons/bs';
import { type IconType } from 'react-icons';

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple";

export const contable: {
    label: string;
    value: string;
    icon: LucideIcon | IconType;
    color: BadgeVariant;
}[] = [
    {
        label: "Sin cargo/Garantía reparación",
        value: "Sin cargo/Garantía reparación",
        icon: CheckCircle,
        color: "success"
    },
    {
        label: "Sin cargo/Comodato",
        value: "Sin cargo/Comodato",
        icon: CheckCircle,
        color: "success"
    },
    {
        label: "Sin cargo/Garantía venta",
        value: "Sin cargo/Garantía venta",
        icon: CheckCircle,
        color: "success"
    },
    {
        label: "Sin cargo",
        value: "Sin cargo",
        icon: CheckCircle,
        color: "success"
    },
    {
        label: "Sin cargo/DISCONFORME",
        value: "Sin cargo/DISCONFORME",
        icon: AlertCircle,
        color: "destructive"
    },
    {
        label: "Presupuestado",
        value: "Presupuestado",
        icon: BsCash,
        color: "warning"
    },
    {
        label: "Pendiente",
        value: "Pendiente",
        icon: Clock,
        color: "warning"
    },
    {
        label: "Facturado",
        value: "Facturado",
        icon: CheckCircle2,
        color: "success"
    }
];

export const estados: {
    label: string;
    value: string;
    color: BadgeVariant;
    icon: LucideIcon | IconType;
}[] = [
    {
        label: "pendiente",
        value: "pendiente",
        color: "outline", // warning
        icon: Clock,
    },
    {
        label: "Preparado",
        value: "Preparado",
        color: "default", // success
        icon: ArrowDownIcon,
    },
    {
        label: "En camino",
        value: "En camino",
        color: "secondary",
        icon: Truck,
    },
    {
        label: "Completado",
        value: "Completadp",
        color: "default", // primary
        icon: CheckCircle,
    },
    {
        label: "Cancelado",
        value: "Cancelado",
        color: "destructive", // danger
        icon: Info,
    },
    {
        label: "Pago",
        value: "Pago",
        color: "default", // success
        icon: BsCash,
    },
];

export const estadosChipColors = {
    "pendiente": "warning",
    "preparado": "success",
    "en camino": "secondary",
    "listo": "primary",
    "cancelado": "danger",
    "Pago": "success",
};

export const statusColorMap: {
    label: string;
    value: string;
    color: BadgeVariant;
    icon: LucideIcon | IconType;
}[] = [
    // Estados completados/exitosos
    {
        label: "Listo/Reparado",
        value: "Listo/Reparado",
        color: "success",
        icon: CircleCheckBig,
    },
    {
        label: "Finalizado",
        value: "Finalizado",
        color: "purple",
        icon: CheckCircle2,
    },
    {
        label: "Facturado",
        value: "Facturado",
        color: "success",
        icon: CheckCircle2,
    },
    {
        label: "Sin cargo",
        value: "Sin cargo",
        color: "success",
        icon: CheckCircle,
    },
    {
        label: "Sin cargo/Garantía reparación",
        value: "Sin cargo/Garantía reparación",
        color: "success",
        icon: CheckCircle,
    },
    {
        label: "Sin cargo/Garantía venta",
        value: "Sin cargo/Garantía venta",
        color: "success",
        icon: CheckCircle,
    },
    {
        label: "Sin cargo/Comodato",
        value: "Sin cargo/Comodato",
        color: "success",
        icon: CheckCircle,
    },
    // Estados de entrega
    {
        label: "Entregar/Enviar",
        value: "Entregar/Enviar",
        color: "info",
        icon: Send,
    },
    {
        label: "Entregar sin reparar",
        value: "Entregar sin reparar",
        color: "info",
        icon: Package,
    },
    // Estados en proceso/reparación
    {
        label: "En reparación",
        value: "En reparación",
        color: "warning",
        icon: Wrench,
    },
    {
        label: "Reparar",
        value: "Reparar",
        color: "warning",
        icon: Wrench,
    },
    {
        label: "Reparar/Pres aceptado",
        value: "Reparar/Pres aceptado",
        color: "warning",
        icon: Wrench,
    },
    {
        label: "Reparar/en garantía",
        value: "Reparar/en garantía",
        color: "warning",
        icon: Wrench,
    },
    {
        label: "Reparar/Mantenimiento",
        value: "Reparar/Mantenimiento",
        color: "warning",
        icon: Wrench,
    },
    // Estados de presupuesto/espera
    {
        label: "Presupuestado/esperando respuesta",
        value: "Presupuestado/esperando respuesta",
        color: "info",
        icon: Clock,
    },
    {
        label: "Presupuestado",
        value: "Presupuestado",
        color: "info",
        icon: FileText,
    },
    {
        label: "Presupuestar al cliente",
        value: "Presupuestar al cliente",
        color: "info",
        icon: FileText,
    },
    {
        label: "Presupuestado/Esperando resp",
        value: "presupuestado/esperando resp",
        color: "info",
        icon: Clock,
    },
    {
        label: "Pendiente",
        value: "Pendiente",
        color: "warning",
        icon: Clock,
    },
    // Estados negativos/bloqueados
    {
        label: "No entregar/No enviar",
        value: "No entregar/No enviar",
        color: "destructive",
        icon: Ban,
    },
    {
        label: "No tiene reparación",
        value: "No tiene reparación",
        color: "outline",
        icon: Ban,
    },
    // Otros
    {
        label: "Enviado a fábrica",
        value: "Enviado a fábrica",
        color: "purple",
        icon: Truck,
    },
];
