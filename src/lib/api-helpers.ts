import { supabase } from './auth-supabase';

/**
 * Helper function to make authenticated API calls
 * Automatically includes the current user's ID in headers
 */
export async function authenticatedApiCall(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get current user session
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error('No authenticated user found');
  }

  // Prepare headers with user ID and session token
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': session.user.id,
    'Authorization': `Bearer ${session.access_token}`,
    ...options.headers,
  };

  // Make the API call
  return fetch(endpoint, {
    ...options,
    headers,
  });
}

/**
 * Helper function to make authenticated API calls with JSON body
 */
export async function authenticatedApiCallWithBody(
  endpoint: string,
  body: unknown,
  options: RequestInit = {}
): Promise<Response> {
  return authenticatedApiCall(endpoint, {
    ...options,
    method: options.method || 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Helper function to get user ID from current session
 */
export async function getCurrentUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    throw new Error('No authenticated user found');
  }
  
  return session.user.id;
}
