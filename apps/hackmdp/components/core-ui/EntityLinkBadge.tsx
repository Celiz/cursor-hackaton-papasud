'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useFormatCurrency } from '@/lib/hooks/use-format-currency';
import {
  FileText,
  Package,
  Receipt,
  Wrench,
  Monitor,
  User,
  Box,
  Wallet,
  Phone,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type EntityType =
  | 'presupuesto'
  | 'pedido'
  | 'factura'
  | 'servicio'
  | 'equipo'
  | 'cliente'
  | 'producto'
  | 'cuenta_corriente'
  | 'ivr'
  | 'pago';

interface EntityMetadata {
  entity_type: EntityType;
  entity_id: string;
  entity_label: string;
  entity_number?: string;
  entity_amount?: number;
  link: string;
}

interface EntityLinkBadgeProps {
  metadata: EntityMetadata;
  className?: string;
  compact?: boolean;
}

const ENTITY_CONFIG: Record<EntityType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  presupuesto: {
    label: 'Presupuesto',
    icon: FileText,
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-50 dark:bg-purple-950/50',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  pedido: {
    label: 'Pedido',
    icon: Package,
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-50 dark:bg-blue-950/50',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  factura: {
    label: 'Factura',
    icon: Receipt,
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-50 dark:bg-green-950/50',
    borderColor: 'border-green-200 dark:border-green-800',
  },
  servicio: {
    label: 'Servicio',
    icon: Wrench,
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-50 dark:bg-orange-950/50',
    borderColor: 'border-orange-200 dark:border-orange-800',
  },
  equipo: {
    label: 'Equipo',
    icon: Monitor,
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/50',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
  },
  cliente: {
    label: 'Cliente',
    icon: User,
    color: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-50 dark:bg-pink-950/50',
    borderColor: 'border-pink-200 dark:border-pink-800',
  },
  producto: {
    label: 'Producto',
    icon: Box,
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/50',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
  },
  cuenta_corriente: {
    label: 'Cuenta Corriente',
    icon: Wallet,
    color: 'text-emerald-700 dark:text-emerald-300',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/50',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  ivr: {
    label: 'IVR',
    icon: Phone,
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-50 dark:bg-amber-950/50',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  pago: {
    label: 'Pago',
    icon: CreditCard,
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-50 dark:bg-teal-950/50',
    borderColor: 'border-teal-200 dark:border-teal-800',
  },
};

export function EntityLinkBadge({
  metadata,
  className,
  compact = false,
}: EntityLinkBadgeProps) {
  const formatCurrency = useFormatCurrency();
  const config = ENTITY_CONFIG[metadata.entity_type];
  if (!config) return null;

  const Icon = config.icon;

  const displayText = metadata.entity_number
    ? `${config.label} #${metadata.entity_number}`
    : metadata.entity_label;

  if (compact) {
    return (
      <Link href={metadata.link} className="group inline-block">
        <Badge
          variant="outline"
          className={cn(
            "gap-1 py-0.5 transition-all cursor-pointer",
            config.bgColor,
            config.borderColor,
            config.color,
            "hover:shadow-md hover:scale-105",
            className
          )}
        >
          <Icon className="h-3 w-3" />
          <span className="font-medium text-[10px]">
            {metadata.entity_number ? `#${metadata.entity_number}` : metadata.entity_label.slice(0, 15)}
          </span>
          <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Badge>
      </Link>
    );
  }

  return (
    <Link href={metadata.link} className="group block">
      <div
        className={cn(
          "rounded-xl border p-3 transition-all cursor-pointer",
          config.bgColor,
          config.borderColor,
          "hover:shadow-lg hover:scale-[1.02]",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            config.bgColor,
            "border",
            config.borderColor
          )}>
            <Icon className={cn("h-5 w-5", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={cn("text-sm font-semibold truncate", config.color)}>
                {displayText}
              </p>
              <ExternalLink className={cn(
                "h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0",
                config.color
              )} />
            </div>
            {metadata.entity_amount && (
              <p className={cn("text-xs font-medium mt-0.5", config.color)}>
                {formatCurrency(metadata.entity_amount)}
              </p>
            )}
            {metadata.entity_label && metadata.entity_number && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {metadata.entity_label}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * Checks if a message content contains an entity link pattern
 * Used to detect entity shares in plain text messages
 */
export function parseEntityFromMessage(content: string): EntityMetadata | null {
  // Pattern: 📎 {EntityType} #{Number} - {Amount} or 📎 {EntityType}: {Label}
  const match = content.match(/📎\s*([\w\s]+?)(?:\s*#(\w+))?(?:\s*-\s*\$?([\d.,]+))?$/);
  if (!match) return null;

  // This is a fallback - prefer using metadata from the message
  return null;
}
