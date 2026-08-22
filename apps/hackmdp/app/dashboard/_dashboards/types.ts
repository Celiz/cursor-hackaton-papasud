'use client'

import { type LucideIcon } from 'lucide-react'

export interface DashboardTabConfig {
  id: string
  label: string
  icon: LucideIcon
  activeColorClass: string
}

export interface QuickAction {
  label: string
  icon: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'outline'
  className?: string
}
