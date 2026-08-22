'use client'

import { type ReactNode } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { StaggeredContainer, StaggeredItem } from '@/components/animations/StaggeredContainer'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DashboardTabConfig, QuickAction } from '../types'

interface DashboardShellProps {
  title?: string
  tabs: DashboardTabConfig[]
  activeTab: string
  onTabChange: (tab: string) => void
  quickActions?: QuickAction[]
  themeGradient?: string
  titleGradient?: string
  extraHeaderContent?: ReactNode
  children: ReactNode
}

export function DashboardShell({
  title = 'Panel de Control',
  tabs,
  activeTab,
  onTabChange,
  quickActions,
  themeGradient = 'from-gray-50 to-purple-50/20 dark:from-gray-950 dark:to-purple-950/5',
  titleGradient = 'from-purple-900 to-purple-700 dark:from-purple-100 dark:to-purple-300',
  extraHeaderContent,
  children,
}: DashboardShellProps) {
  return (
    <div className={`flex-1 flex flex-col min-w-0 p-3 md:p-4 bg-gradient-to-br ${themeGradient}`}>
      <StaggeredContainer id="dashboard-main" className="space-y-3">
        {/* Encabezado con Tabs */}
        <StaggeredItem>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="flex items-center gap-3">
              <div>
                <h1 className={`text-base font-bold tracking-tight bg-gradient-to-r ${titleGradient} bg-clip-text text-transparent`}>
                  {title}
                </h1>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: es })}
                </p>
              </div>
              {extraHeaderContent}
            </div>

            <Tabs value={activeTab} onValueChange={onTabChange} className="min-w-0 shrink">
              <TabsList className="h-auto p-1 bg-white/80 dark:bg-zinc-900/80 border border-gray-200/50 dark:border-zinc-700/50 shadow-sm flex flex-wrap gap-1">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={`gap-1.5 px-2 sm:px-3 ${tab.activeColorClass}`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </StaggeredItem>

        {/* Botones de acceso rápido */}
        {quickActions && quickActions.length > 0 && (
          <StaggeredItem>
            <div className="flex flex-wrap gap-3">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  onClick={action.onClick}
                  variant={action.variant || 'default'}
                  className={action.className}
                >
                  {action.icon}
                  {action.label}
                </Button>
              ))}
            </div>
          </StaggeredItem>
        )}

        {/* Tab content — key forces re-mount on tab change so StaggeredItems animate in */}
        <StaggeredContainer key={activeTab} id={`dashboard-tab-${activeTab}`} className="space-y-3">
          {children}
        </StaggeredContainer>
      </StaggeredContainer>
    </div>
  )
}
