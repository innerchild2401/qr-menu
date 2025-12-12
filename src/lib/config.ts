/**
 * Centralized configuration for SmartMenu
 * All hardcoded values should be moved here and made configurable via environment variables
 */

// ============================================================================
// ADMIN CONFIGURATION
// ============================================================================

export const ADMIN_CONFIG = {
  /** Admin email address for token consumption and insights access */
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'afilip.mme@gmail.com',
} as const;

// ============================================================================
// AI CONFIGURATION
// ============================================================================

export const AI_CONFIG = {
  /** OpenAI API model to use */
  MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  
  /** OpenAI API base URL */
  API_URL: process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions',
  
  /** Maximum tokens for product generation */
  MAX_TOKENS: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
  
  /** Daily cost limit per restaurant (in USD) */
  DAILY_COST_LIMIT_PER_RESTAURANT: parseFloat(process.env.OPENAI_DAILY_COST_LIMIT || '10.0'),
  
  /** OpenAI pricing per token (in USD) */
  PRICING: {
    'gpt-4o-mini': {
      prompt: parseFloat(process.env.OPENAI_PROMPT_COST || '0.00000015'),
      completion: parseFloat(process.env.OPENAI_COMPLETION_COST || '0.00000060'),
    },
  },
} as const;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_CONFIG = {
  /** Default language for new restaurants */
  LANGUAGE: (process.env.DEFAULT_LANGUAGE || 'ro') as 'ro' | 'en',
  
  /** Default currency for new restaurants */
  CURRENCY: process.env.DEFAULT_CURRENCY || 'RON',
  
  /** Default currency options */
  CURRENCIES: ['RON', 'EUR', 'USD', 'GBP'] as const,
  
  /** Supported languages */
  LANGUAGES: ['ro', 'en'] as const,
} as const;

// ============================================================================
// APPLICATION CONFIGURATION
// ============================================================================

export const APP_CONFIG = {
  /** Application base URL */
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  /** Node environment */
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  /** Whether menu admin is enabled */
  ENABLE_MENU_ADMIN: process.env.NEXT_PUBLIC_ENABLE_MENU_ADMIN === 'true',
  
  /** Is production environment */
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  /** Is development environment */
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
} as const;

// ============================================================================
// TEST CONFIGURATION (for development/testing only)
// ============================================================================

export const TEST_CONFIG = {
  /** Test user email (for development scripts) */
  TEST_EMAIL: process.env.TEST_EMAIL || 'eu@eu.com',
  
  /** Test user password (for development scripts) */
  TEST_PASSWORD: process.env.TEST_PASSWORD || 'parolamea',
  
  /** Demo user email */
  DEMO_EMAIL: process.env.DEMO_EMAIL || 'admin@bellavista.com',
  
  /** Demo user password */
  DEMO_PASSWORD: process.env.DEMO_PASSWORD || 'admin123',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get OpenAI pricing for a specific model
 */
export function getOpenAIPricing(model: string = AI_CONFIG.MODEL) {
  return AI_CONFIG.PRICING[model as keyof typeof AI_CONFIG.PRICING] || AI_CONFIG.PRICING['gpt-4o-mini'];
}

/**
 * Check if user is admin
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_CONFIG.ADMIN_EMAIL.toLowerCase();
}

/**
 * Get default language
 */
export function getDefaultLanguage(): 'ro' | 'en' {
  return DEFAULT_CONFIG.LANGUAGE;
}

/**
 * Get default currency
 */
export function getDefaultCurrency(): string {
  return DEFAULT_CONFIG.CURRENCY;
}

