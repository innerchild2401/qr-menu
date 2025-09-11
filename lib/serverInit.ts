import { initializeUploadsDirectory } from './uploadUtils';

/**
 * Initialize server-side resources on startup
 */
export async function initializeServer(): Promise<void> {
  console.log('🚀 Initializing server resources...');
  
  // Only initialize uploads directory in non-serverless environments
  // In serverless environments (like Vercel), file system access is limited
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
  
  if (!isServerless) {
    try {
      await initializeUploadsDirectory();
    } catch (error) {
      console.warn('⚠️ Could not initialize uploads directory (this is normal in serverless environments):', error);
    }
  } else {
    console.log('📦 Serverless environment detected - skipping uploads directory initialization');
  }
  
  console.log('✅ Server initialization complete');
}

// Auto-initialize when this module is imported in a server context
if (typeof window === 'undefined') {
  initializeServer().catch(console.error);
}
