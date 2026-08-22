"use client"

import { useEffect } from "react"
import { useSession } from "@/lib/hooks/use-session"
import { getOrgTheme, type OrgTheme } from "@/lib/org-themes"

export function OrgThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const theme = session?.user?.orgTheme as OrgTheme | undefined

  useEffect(() => {
    const orgTheme = getOrgTheme(theme)
    const root = document.documentElement
    const isDark = document.documentElement.classList.contains('dark')

    // Override Tailwind CSS variables with org theme colors
    // These HSL values are used by Shadcn/Tailwind components

    // Light mode values (always set as base)
    root.style.setProperty('--primary', orgTheme.primary)
    root.style.setProperty('--primary-foreground', orgTheme.primaryForeground)
    root.style.setProperty('--accent', orgTheme.accent)
    root.style.setProperty('--accent-foreground', orgTheme.accentForeground)
    root.style.setProperty('--ring', orgTheme.ring)
    root.style.setProperty('--sidebar-primary', orgTheme.sidebarPrimary)
    root.style.setProperty('--sidebar-accent', orgTheme.sidebarAccent)
    root.style.setProperty('--sidebar-ring', orgTheme.ring)

    // Store dark mode values for CSS to use
    root.style.setProperty('--org-primary-dark', orgTheme.primaryDark)
    root.style.setProperty('--org-accent-dark', orgTheme.accentDark)
    root.style.setProperty('--org-ring-dark', orgTheme.ringDark)
    root.style.setProperty('--org-sidebar-primary-dark', orgTheme.sidebarPrimaryDark)
    root.style.setProperty('--org-sidebar-accent-dark', orgTheme.sidebarAccentDark)

    // Gradient colors for background effects
    root.style.setProperty('--org-gradient-from', orgTheme.gradientFrom)
    root.style.setProperty('--org-gradient-to', orgTheme.gradientTo)

    // Chart colors
    root.style.setProperty('--chart-1', orgTheme.chart1)
    root.style.setProperty('--chart-2', orgTheme.chart2)
    root.style.setProperty('--chart-3', orgTheme.chart3)
    root.style.setProperty('--chart-4', orgTheme.chart4)
    root.style.setProperty('--chart-5', orgTheme.chart5)

    // Add theme identifier to body
    document.body.dataset.orgTheme = theme || 'purple'

    // Handle dark mode changes
    const updateDarkMode = () => {
      const isDarkNow = document.documentElement.classList.contains('dark')
      if (isDarkNow) {
        root.style.setProperty('--primary', orgTheme.primaryDark)
        root.style.setProperty('--accent', orgTheme.accentDark)
        root.style.setProperty('--ring', orgTheme.ringDark)
        root.style.setProperty('--sidebar-primary', orgTheme.sidebarPrimaryDark)
        root.style.setProperty('--sidebar-accent', orgTheme.sidebarAccentDark)
        root.style.setProperty('--sidebar-ring', orgTheme.ringDark)
      } else {
        root.style.setProperty('--primary', orgTheme.primary)
        root.style.setProperty('--accent', orgTheme.accent)
        root.style.setProperty('--ring', orgTheme.ring)
        root.style.setProperty('--sidebar-primary', orgTheme.sidebarPrimary)
        root.style.setProperty('--sidebar-accent', orgTheme.sidebarAccent)
        root.style.setProperty('--sidebar-ring', orgTheme.ring)
      }
    }

    // Initial check
    updateDarkMode()

    // Watch for dark mode changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateDarkMode()
        }
      })
    })

    observer.observe(document.documentElement, { attributes: true })

    return () => {
      observer.disconnect()
      // Cleanup CSS variables
      root.style.removeProperty('--primary')
      root.style.removeProperty('--primary-foreground')
      root.style.removeProperty('--accent')
      root.style.removeProperty('--accent-foreground')
      root.style.removeProperty('--ring')
      root.style.removeProperty('--sidebar-primary')
      root.style.removeProperty('--sidebar-accent')
      root.style.removeProperty('--sidebar-ring')
      root.style.removeProperty('--org-primary-dark')
      root.style.removeProperty('--org-accent-dark')
      root.style.removeProperty('--org-ring-dark')
      root.style.removeProperty('--org-sidebar-primary-dark')
      root.style.removeProperty('--org-sidebar-accent-dark')
      root.style.removeProperty('--org-gradient-from')
      root.style.removeProperty('--org-gradient-to')
      root.style.removeProperty('--chart-1')
      root.style.removeProperty('--chart-2')
      root.style.removeProperty('--chart-3')
      root.style.removeProperty('--chart-4')
      root.style.removeProperty('--chart-5')
    }
  }, [theme])

  return <>{children}</>
}
