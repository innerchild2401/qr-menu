/**
 * Environment variable validation and configuration
 * Ensures all required environment variables are present
 * 
 * NOTE: For application configuration constants, use src/lib/config.ts instead
 */

// Required environment variables
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
} as const;

// AI-related environment variables (optional for now, but recommended)
const aiEnvVars = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
} as const;

// Optional environment variables with safe defaults
const optionalEnvVars = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  NEXT_PUBLIC_ENABLE_MENU_ADMIN: process.env.NEXT_PUBLIC_ENABLE_MENU_ADMIN || 'false',
  NODE_ENV: process.env.NODE_ENV || 'development',
  WHATSAPP_BUSINESS_NUMBER: process.env.WHATSAPP_BUSINESS_NUMBER, // Single WhatsApp number for all restaurants
} as const;

/**
 * Validate that all required environment variables are present
 */
function validateEnvironment(): void {
  const missingVars: string[] = [];

  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
      missingVars.push(key);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

// Validate environment on module load
if (typeof window === 'undefined') {
  // Only validate on server-side to avoid exposing errors to client
  validateEnvironment();
}

/**
 * Type-safe environment variable access
 * 
 * NOTE: For application configuration (AI model, defaults, etc.), 
 * use src/lib/config.ts instead
 */
export const env = {
  // Required variables (will throw if missing)
  SUPABASE_URL: requiredEnvVars.NEXT_PUBLIC_SUPABASE_URL!,
  SUPABASE_ANON_KEY: requiredEnvVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!,
  
  // AI variables (optional)
  OPENAI_API_KEY: aiEnvVars.OPENAI_API_KEY,
  
  // Optional variables with defaults
  APP_URL: optionalEnvVars.NEXT_PUBLIC_APP_URL,
  ENABLE_MENU_ADMIN: optionalEnvVars.NEXT_PUBLIC_ENABLE_MENU_ADMIN === 'true',
  NODE_ENV: optionalEnvVars.NODE_ENV,
  WHATSAPP_BUSINESS_NUMBER: optionalEnvVars.WHATSAPP_BUSINESS_NUMBER,
  
  // Derived values
  IS_PRODUCTION: optionalEnvVars.NODE_ENV === 'production',
  IS_DEVELOPMENT: optionalEnvVars.NODE_ENV === 'development',
  HAS_OPENAI: !!aiEnvVars.OPENAI_API_KEY,
} as const;

export type Environment = typeof env;
