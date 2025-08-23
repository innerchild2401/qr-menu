import { initializeUploadsDirectory } from './uploadUtils';

/**
 * Initialize server-side resources on startup
 */
export async function initializeServer(): Promise<void> {
  console.log('🚀 Initializing server resources...');
  
  // Initialize uploads directory
  await initializeUploadsDirectory();
  
  console.log('✅ Server initialization complete');
}

// Auto-initialize when this module is imported in a server context
if (typeof window === 'undefined') {
  initializeServer().catch(console.error);
}
