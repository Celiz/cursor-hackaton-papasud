// Organization theme definitions
// Each theme defines the primary color palette using HSL values (matching Tailwind CSS)

export type OrgTheme = 'purple' | 'amber' | 'emerald' | 'blue' | 'rose' | 'cyan' | 'locus'

export interface OrgThemeColors {
  name: string
  // Light mode
  primary: string           // HSL for primary color
  primaryForeground: string
  accent: string            // HSL for accent color
  accentForeground: string
  ring: string
  // Dark mode
  primaryDark: string
  accentDark: string
  ringDark: string
  // Sidebar
  sidebarPrimary: string
  sidebarAccent: string
  sidebarPrimaryDark: string
  sidebarAccentDark: string
  // Gradient (for background effects)
  gradientFrom: string
  gradientTo: string
  // Chart colors (5 variations)
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
}

export const orgThemes: Record<OrgTheme, OrgThemeColors> = {
  purple: {
    name: 'Purple',
    // Light mode - original violet/purple theme
    primary: '255 75% 50%',           // violet-purple
    primaryForeground: '0 0% 100%',
    accent: '270 60% 55%',            // purple accent
    accentForeground: '0 0% 100%',
    ring: '255 75% 50%',
    // Dark mode
    primaryDark: '255 75% 60%',
    accentDark: '270 60% 58%',
    ringDark: '255 75% 60%',
    // Sidebar
    sidebarPrimary: '255 75% 50%',
    sidebarAccent: '270 60% 55%',
    sidebarPrimaryDark: '255 75% 60%',
    sidebarAccentDark: '270 60% 58%',
    // Gradient
    gradientFrom: '255 75% 50%',
    gradientTo: '270 60% 55%',
    // Charts
    chart1: '255 75% 45%',
    chart2: '270 55% 35%',
    chart3: '225 60% 50%',
    chart4: '240 40% 70%',
    chart5: '280 50% 45%',
  },
  amber: {
    name: 'Amber',
    // Light mode
    primary: '38 92% 50%',            // amber-500
    primaryForeground: '0 0% 100%',
    accent: '32 95% 44%',             // amber-600
    accentForeground: '0 0% 100%',
    ring: '38 92% 50%',
    // Dark mode
    primaryDark: '38 92% 55%',
    accentDark: '32 95% 50%',
    ringDark: '38 92% 55%',
    // Sidebar
    sidebarPrimary: '38 92% 50%',
    sidebarAccent: '32 95% 44%',
    sidebarPrimaryDark: '38 92% 55%',
    sidebarAccentDark: '32 95% 50%',
    // Gradient
    gradientFrom: '38 92% 50%',
    gradientTo: '32 95% 44%',
    // Charts - warm amber palette
    chart1: '38 92% 50%',
    chart2: '25 95% 53%',
    chart3: '45 93% 47%',
    chart4: '20 90% 48%',
    chart5: '30 90% 40%',
  },
  emerald: {
    name: 'Emerald',
    // Light mode
    primary: '160 84% 39%',           // emerald-500
    primaryForeground: '0 0% 100%',
    accent: '161 94% 30%',            // emerald-600
    accentForeground: '0 0% 100%',
    ring: '160 84% 39%',
    // Dark mode
    primaryDark: '160 84% 45%',
    accentDark: '161 94% 38%',
    ringDark: '160 84% 45%',
    // Sidebar
    sidebarPrimary: '160 84% 39%',
    sidebarAccent: '161 94% 30%',
    sidebarPrimaryDark: '160 84% 45%',
    sidebarAccentDark: '161 94% 38%',
    // Gradient
    gradientFrom: '160 84% 39%',
    gradientTo: '161 94% 30%',
    // Charts - green/teal palette
    chart1: '160 84% 39%',
    chart2: '142 76% 36%',
    chart3: '173 80% 40%',
    chart4: '152 69% 31%',
    chart5: '166 72% 28%',
  },
  blue: {
    name: 'Blue',
    // Light mode
    primary: '217 91% 60%',           // blue-500
    primaryForeground: '0 0% 100%',
    accent: '221 83% 53%',            // blue-600
    accentForeground: '0 0% 100%',
    ring: '217 91% 60%',
    // Dark mode
    primaryDark: '217 91% 65%',
    accentDark: '221 83% 58%',
    ringDark: '217 91% 65%',
    // Sidebar
    sidebarPrimary: '217 91% 60%',
    sidebarAccent: '221 83% 53%',
    sidebarPrimaryDark: '217 91% 65%',
    sidebarAccentDark: '221 83% 58%',
    // Gradient
    gradientFrom: '217 91% 60%',
    gradientTo: '221 83% 53%',
    // Charts - blue palette
    chart1: '217 91% 60%',
    chart2: '199 89% 48%',
    chart3: '231 48% 48%',
    chart4: '210 79% 46%',
    chart5: '224 76% 48%',
  },
  rose: {
    name: 'Rose',
    // Light mode
    primary: '350 89% 60%',           // rose-500
    primaryForeground: '0 0% 100%',
    accent: '347 77% 50%',            // rose-600
    accentForeground: '0 0% 100%',
    ring: '350 89% 60%',
    // Dark mode
    primaryDark: '350 89% 65%',
    accentDark: '347 77% 55%',
    ringDark: '350 89% 65%',
    // Sidebar
    sidebarPrimary: '350 89% 60%',
    sidebarAccent: '347 77% 50%',
    sidebarPrimaryDark: '350 89% 65%',
    sidebarAccentDark: '347 77% 55%',
    // Gradient
    gradientFrom: '350 89% 60%',
    gradientTo: '347 77% 50%',
    // Charts - rose/pink palette
    chart1: '350 89% 60%',
    chart2: '330 81% 60%',
    chart3: '0 72% 51%',
    chart4: '340 82% 52%',
    chart5: '320 70% 50%',
  },
  cyan: {
    name: 'Cyan',
    // Light mode
    primary: '189 94% 43%',           // cyan-500
    primaryForeground: '0 0% 100%',
    accent: '192 91% 36%',            // cyan-600
    accentForeground: '0 0% 100%',
    ring: '189 94% 43%',
    // Dark mode
    primaryDark: '189 94% 50%',
    accentDark: '192 91% 43%',
    ringDark: '189 94% 50%',
    // Sidebar
    sidebarPrimary: '189 94% 43%',
    sidebarAccent: '192 91% 36%',
    sidebarPrimaryDark: '189 94% 50%',
    sidebarAccentDark: '192 91% 43%',
    // Gradient
    gradientFrom: '189 94% 43%',
    gradientTo: '192 91% 36%',
    // Charts - cyan/teal palette
    chart1: '189 94% 43%',
    chart2: '175 77% 26%',
    chart3: '199 89% 48%',
    chart4: '183 85% 35%',
    chart5: '195 84% 39%',
  },
  locus: {
    name: 'Locus',
    // Light mode — multicolor/purple base
    primary: '270 60% 50%',
    primaryForeground: '0 0% 100%',
    accent: '220 70% 55%',
    accentForeground: '0 0% 100%',
    ring: '270 60% 50%',
    // Dark mode
    primaryDark: '270 60% 60%',
    accentDark: '220 70% 60%',
    ringDark: '270 60% 60%',
    // Sidebar
    sidebarPrimary: '270 60% 50%',
    sidebarAccent: '220 70% 55%',
    sidebarPrimaryDark: '270 60% 60%',
    sidebarAccentDark: '220 70% 60%',
    // Gradient — multicolor inspired
    gradientFrom: '270 60% 50%',
    gradientTo: '190 80% 45%',
    // Charts — diverse palette matching the orb
    chart1: '270 60% 50%',
    chart2: '217 91% 60%',
    chart3: '160 84% 39%',
    chart4: '38 92% 50%',
    chart5: '350 89% 60%',
  },
}

export function getOrgTheme(theme?: string | null): OrgThemeColors {
  if (theme && theme in orgThemes) {
    return orgThemes[theme as OrgTheme]
  }
  return orgThemes.purple // default
}
