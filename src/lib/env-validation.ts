/**
 * Environment Variable Validation
 * Centralized validation for all required environment variables
 */

interface EnvironmentConfig {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  OPENAI_API_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NODE_ENV?: string;
}

class EnvironmentValidator {
  private static instance: EnvironmentValidator;
  private config: EnvironmentConfig | null = null;
  private isValidated = false;

  private constructor() {}

  public static getInstance(): EnvironmentValidator {
    if (!EnvironmentValidator.instance) {
      EnvironmentValidator.instance = new EnvironmentValidator();
    }
    return EnvironmentValidator.instance;
  }

  /**
   * Validate all required environment variables
   */
  public validate(): EnvironmentConfig {
    if (this.isValidated && this.config) {
      return this.config;
    }

    const requiredVars = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    const optionalVars = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      NODE_ENV: process.env.NODE_ENV || 'development',
    };

    // Check for missing required variables
    const missingVars: string[] = [];
    for (const [key, value] of Object.entries(requiredVars)) {
      if (!value || value.trim() === '') {
        missingVars.push(key);
      }
    }

    if (missingVars.length > 0) {
      const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
      console.error('Environment validation failed:', errorMessage);
      throw new Error(errorMessage);
    }

    // Validate Supabase URL format
    if (!requiredVars.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://')) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL');
    }

    // Validate Supabase keys format (JWT tokens)
    if (!this.isValidJWT(requiredVars.NEXT_PUBLIC_SUPABASE_ANON_KEY!)) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY must be a valid JWT token');
    }

    if (!this.isValidJWT(requiredVars.SUPABASE_SERVICE_ROLE_KEY!)) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY must be a valid JWT token');
    }

    // Validate OpenAI API key format if provided
    if (optionalVars.OPENAI_API_KEY && !this.isValidOpenAIKey(optionalVars.OPENAI_API_KEY)) {
      throw new Error('OPENAI_API_KEY must be a valid OpenAI API key');
    }

    this.config = {
      ...requiredVars,
      ...optionalVars,
    } as EnvironmentConfig;

    this.isValidated = true;
    return this.config;
  }

  /**
   * Get validated environment configuration
   */
  public getConfig(): EnvironmentConfig {
    if (!this.isValidated) {
      return this.validate();
    }
    return this.config!;
  }

  /**
   * Check if environment is properly configured
   */
  public isConfigured(): boolean {
    try {
      this.validate();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate JWT token format (lenient validation for Supabase tokens)
   */
  private isValidJWT(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Basic validation - check if parts exist and are not empty
    if (parts.some(part => part.length === 0)) return false;
    
    // For Supabase tokens, we'll be more lenient with the validation
    // Just check that it looks like a JWT structure
    return parts.every(part => part.length > 0);
  }

  /**
   * Validate OpenAI API key format
   */
  private isValidOpenAIKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    
    // OpenAI API keys start with 'sk-' and are 51 characters long
    return key.startsWith('sk-') && key.length === 51;
  }

  /**
   * Get environment status for debugging (safe for logging)
   */
  public getStatus(): Record<string, string> {
    return {
      NODE_ENV: process.env.NODE_ENV || 'not set',
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
      SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set',
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not set',
      APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'Not set',
    };
  }
}

// Export singleton instance
export const envValidator = EnvironmentValidator.getInstance();

// Export convenience functions
export function validateEnvironment(): EnvironmentConfig {
  return envValidator.validate();
}

export function getEnvironmentConfig(): EnvironmentConfig {
  return envValidator.getConfig();
}

export function isEnvironmentConfigured(): boolean {
  return envValidator.isConfigured();
}

export function getEnvironmentStatus(): Record<string, string> {
  return envValidator.getStatus();
}
