// Design System Constants
// This file defines consistent spacing, typography, and component patterns

export const spacing = {
  xs: 'p-2',
  sm: 'p-4', 
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12',
  '2xl': 'p-16'
} as const;

export const margins = {
  xs: 'm-2',
  sm: 'm-4',
  md: 'm-6', 
  lg: 'm-8',
  xl: 'm-12',
  '2xl': 'm-16'
} as const;

export const gaps = {
  xs: 'gap-2',
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8',
  xl: 'gap-12'
} as const;

export const typography = {
  h1: 'text-4xl md:text-5xl font-bold text-foreground',
  h2: 'text-3xl font-semibold text-foreground',
  h3: 'text-2xl font-semibold text-foreground',
  h4: 'text-xl font-semibold text-foreground',
  body: 'text-base text-foreground',
  bodySmall: 'text-sm text-muted-foreground',
  caption: 'text-xs text-muted-foreground'
} as const;

export const layout = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  containerSmall: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
  section: 'py-12 md:py-16 lg:py-20',
  card: 'rounded-xl border bg-card text-card-foreground shadow-sm',
  cardHover: 'hover:shadow-lg transition-shadow duration-200'
} as const;

export const button = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
} as const;
