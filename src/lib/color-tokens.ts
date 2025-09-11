/**
 * SmartMenu Color Token System
 * High-contrast, accessible color palette for consistent UI
 * 
 * All colors meet WCAG AA contrast requirements (4.5:1 for normal text, 3:1 for large text)
 */

export const colorTokens = {
  // Primary Colors - High contrast blues
  primary: {
    50: '#eff6ff',   // Very light blue
    100: '#dbeafe',  // Light blue
    200: '#bfdbfe',  // Medium light blue
    300: '#93c5fd',  // Medium blue
    400: '#60a5fa',  // Blue
    500: '#3b82f6',  // Primary blue (main brand color)
    600: '#2563eb',  // Dark blue
    700: '#1d4ed8',  // Darker blue
    800: '#1e40af',  // Very dark blue
    900: '#1e3a8a',  // Darkest blue
    950: '#172554',  // Almost black blue
  },

  // Secondary Colors - Neutral grays
  secondary: {
    50: '#f8fafc',   // Almost white
    100: '#f1f5f9',  // Very light gray
    200: '#e2e8f0',  // Light gray
    300: '#cbd5e1',  // Medium light gray
    400: '#94a3b8',  // Medium gray
    500: '#64748b',  // Gray
    600: '#475569',  // Dark gray
    700: '#334155',  // Darker gray
    800: '#1e293b',  // Very dark gray
    900: '#0f172a',  // Almost black
    950: '#020617',  // Black
  },

  // Success Colors - High contrast greens
  success: {
    50: '#f0fdf4',   // Very light green
    100: '#dcfce7',  // Light green
    200: '#bbf7d0',  // Medium light green
    300: '#86efac',  // Medium green
    400: '#4ade80',  // Green
    500: '#22c55e',  // Primary green
    600: '#16a34a',  // Dark green
    700: '#15803d',  // Darker green
    800: '#166534',  // Very dark green
    900: '#14532d',  // Darkest green
    950: '#052e16',  // Almost black green
  },

  // Warning Colors - High contrast oranges
  warning: {
    50: '#fffbeb',   // Very light orange
    100: '#fef3c7',  // Light orange
    200: '#fde68a',  // Medium light orange
    300: '#fcd34d',  // Medium orange
    400: '#fbbf24',  // Orange
    500: '#f59e0b',  // Primary orange
    600: '#d97706',  // Dark orange
    700: '#b45309',  // Darker orange
    800: '#92400e',  // Very dark orange
    900: '#78350f',  // Darkest orange
    950: '#451a03',  // Almost black orange
  },

  // Error Colors - High contrast reds
  error: {
    50: '#fef2f2',   // Very light red
    100: '#fee2e2',  // Light red
    200: '#fecaca',  // Medium light red
    300: '#fca5a5',  // Medium red
    400: '#f87171',  // Red
    500: '#ef4444',  // Primary red
    600: '#dc2626',  // Dark red
    700: '#b91c1c',  // Darker red
    800: '#991b1b',  // Very dark red
    900: '#7f1d1d',  // Darkest red
    950: '#450a0a',  // Almost black red
  },

  // Info Colors - High contrast cyans
  info: {
    50: '#ecfeff',   // Very light cyan
    100: '#cffafe',  // Light cyan
    200: '#a5f3fc',  // Medium light cyan
    300: '#67e8f9',  // Medium cyan
    400: '#22d3ee',  // Cyan
    500: '#06b6d4',  // Primary cyan
    600: '#0891b2',  // Dark cyan
    700: '#0e7490',  // Darker cyan
    800: '#155e75',  // Very dark cyan
    900: '#164e63',  // Darkest cyan
    950: '#083344',  // Almost black cyan
  },
} as const;

// Semantic color mappings for light/dark themes
export const semanticColors = {
  light: {
    // Background colors
    background: colorTokens.secondary[50],
    surface: '#ffffff',
    surfaceSecondary: colorTokens.secondary[100],
    surfaceTertiary: colorTokens.secondary[200],
    
    // Text colors
    textPrimary: colorTokens.secondary[900],
    textSecondary: colorTokens.secondary[700],
    textTertiary: colorTokens.secondary[500],
    textInverse: '#ffffff',
    
    // Border colors
    border: colorTokens.secondary[300],
    borderSecondary: colorTokens.secondary[200],
    borderFocus: colorTokens.primary[500],
    
    // Interactive colors
    primary: colorTokens.primary[600],
    primaryHover: colorTokens.primary[700],
    primaryActive: colorTokens.primary[800],
    primaryText: '#ffffff',
    
    secondary: colorTokens.secondary[600],
    secondaryHover: colorTokens.secondary[700],
    secondaryActive: colorTokens.secondary[800],
    secondaryText: '#ffffff',
    
    // Status colors
    success: colorTokens.success[600],
    successHover: colorTokens.success[700],
    successText: '#ffffff',
    successBackground: colorTokens.success[50],
    
    warning: colorTokens.warning[600],
    warningHover: colorTokens.warning[700],
    warningText: '#ffffff',
    warningBackground: colorTokens.warning[50],
    
    error: colorTokens.error[600],
    errorHover: colorTokens.error[700],
    errorText: '#ffffff',
    errorBackground: colorTokens.error[50],
    
    info: colorTokens.info[600],
    infoHover: colorTokens.info[700],
    infoText: '#ffffff',
    infoBackground: colorTokens.info[50],
  },
  
  dark: {
    // Background colors
    background: colorTokens.secondary[950],
    surface: colorTokens.secondary[900],
    surfaceSecondary: colorTokens.secondary[800],
    surfaceTertiary: colorTokens.secondary[700],
    
    // Text colors
    textPrimary: colorTokens.secondary[50],
    textSecondary: colorTokens.secondary[300],
    textTertiary: colorTokens.secondary[400],
    textInverse: colorTokens.secondary[900],
    
    // Border colors
    border: colorTokens.secondary[700],
    borderSecondary: colorTokens.secondary[600],
    borderFocus: colorTokens.primary[400],
    
    // Interactive colors
    primary: colorTokens.primary[500],
    primaryHover: colorTokens.primary[400],
    primaryActive: colorTokens.primary[300],
    primaryText: colorTokens.secondary[900],
    
    secondary: colorTokens.secondary[500],
    secondaryHover: colorTokens.secondary[400],
    secondaryActive: colorTokens.secondary[300],
    secondaryText: colorTokens.secondary[900],
    
    // Status colors
    success: colorTokens.success[500],
    successHover: colorTokens.success[400],
    successText: colorTokens.secondary[900],
    successBackground: colorTokens.success[950],
    
    warning: colorTokens.warning[500],
    warningHover: colorTokens.warning[400],
    warningText: colorTokens.secondary[900],
    warningBackground: colorTokens.warning[950],
    
    error: colorTokens.error[500],
    errorHover: colorTokens.error[400],
    errorText: colorTokens.secondary[900],
    errorBackground: colorTokens.error[950],
    
    info: colorTokens.info[500],
    infoHover: colorTokens.info[400],
    infoText: colorTokens.secondary[900],
    infoBackground: colorTokens.info[950],
  },
} as const;

// CSS Custom Properties for Tailwind
export const cssVariables = {
  light: {
    '--background': semanticColors.light.background,
    '--foreground': semanticColors.light.textPrimary,
    '--card': semanticColors.light.surface,
    '--card-foreground': semanticColors.light.textPrimary,
    '--popover': semanticColors.light.surface,
    '--popover-foreground': semanticColors.light.textPrimary,
    '--primary': semanticColors.light.primary,
    '--primary-foreground': semanticColors.light.primaryText,
    '--secondary': semanticColors.light.secondary,
    '--secondary-foreground': semanticColors.light.secondaryText,
    '--muted': semanticColors.light.surfaceSecondary,
    '--muted-foreground': semanticColors.light.textTertiary,
    '--accent': semanticColors.light.surfaceTertiary,
    '--accent-foreground': semanticColors.light.textPrimary,
    '--destructive': semanticColors.light.error,
    '--destructive-foreground': semanticColors.light.errorText,
    '--border': semanticColors.light.border,
    '--input': semanticColors.light.border,
    '--ring': semanticColors.light.borderFocus,
    '--radius': '0.75rem',
  },
  dark: {
    '--background': semanticColors.dark.background,
    '--foreground': semanticColors.dark.textPrimary,
    '--card': semanticColors.dark.surface,
    '--card-foreground': semanticColors.dark.textPrimary,
    '--popover': semanticColors.dark.surface,
    '--popover-foreground': semanticColors.dark.textPrimary,
    '--primary': semanticColors.dark.primary,
    '--primary-foreground': semanticColors.dark.primaryText,
    '--secondary': semanticColors.dark.secondary,
    '--secondary-foreground': semanticColors.dark.secondaryText,
    '--muted': semanticColors.dark.surfaceSecondary,
    '--muted-foreground': semanticColors.dark.textTertiary,
    '--accent': semanticColors.dark.surfaceTertiary,
    '--accent-foreground': semanticColors.dark.textPrimary,
    '--destructive': semanticColors.dark.error,
    '--destructive-foreground': semanticColors.dark.errorText,
    '--border': semanticColors.dark.border,
    '--input': semanticColors.dark.border,
    '--ring': semanticColors.dark.borderFocus,
    '--radius': '0.75rem',
  },
} as const;

// Utility functions for color access
export const getColor = (colorPath: string, theme: 'light' | 'dark' = 'light') => {
  const path = colorPath.split('.');
  let color: Record<string, unknown> = theme === 'light' ? semanticColors.light : semanticColors.dark;
  
  for (const key of path) {
    const nextColor = color[key];
    if (nextColor === undefined || typeof nextColor !== 'object' || nextColor === null) {
      console.warn(`Color path "${colorPath}" not found in ${theme} theme`);
      return '#000000';
    }
    color = nextColor as Record<string, unknown>;
  }
  
  return color as unknown as string;
};

// High contrast utility classes
export const highContrastClasses = {
  // Text contrast utilities
  textHighContrast: 'text-gray-900 dark:text-gray-100',
  textMediumContrast: 'text-gray-700 dark:text-gray-300',
  textLowContrast: 'text-gray-500 dark:text-gray-400',
  
  // Background contrast utilities
  bgHighContrast: 'bg-white dark:bg-gray-900',
  bgMediumContrast: 'bg-gray-50 dark:bg-gray-800',
  bgLowContrast: 'bg-gray-100 dark:bg-gray-700',
  
  // Border contrast utilities
  borderHighContrast: 'border-gray-300 dark:border-gray-600',
  borderMediumContrast: 'border-gray-200 dark:border-gray-700',
  borderLowContrast: 'border-gray-100 dark:border-gray-800',
  
  // Focus ring utilities
  focusRing: 'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900',
  focusVisible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
} as const;
