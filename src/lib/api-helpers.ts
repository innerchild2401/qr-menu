import { supabase } from './auth-supabase';
import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env } from './env';

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
 * Get authenticated user and their restaurant from API request
 */
export async function getAuthenticatedUser(request: NextRequest) {
  try {
    // Check for Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Authentication required', status: 401 };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    const supabase = createServerClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {
            // Not needed for read operations
          },
          remove() {
            // Not needed for read operations
          },
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Verify the token by getting the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { error: 'Authentication required', status: 401 };
    }

    // Get user's restaurant
    const { data: userRestaurants, error: restaurantError } = await supabase
      .from('user_restaurants')
      .select(`
        restaurant_id,
        role,
        restaurants!inner (
          id,
          name,
          slug,
          owner_id
        )
      `)
      .eq('user_id', user.id);

    if (restaurantError) {
      console.error('Error fetching user restaurants:', restaurantError);
      return { error: 'Failed to fetch restaurant data', status: 500 };
    }

    if (!userRestaurants || userRestaurants.length === 0) {
      // Fallback: check if user is direct owner
      const { data: ownedRestaurants, error: ownerError } = await supabase
        .from('restaurants')
        .select('id, name, slug, owner_id')
        .eq('owner_id', user.id);

      if (ownerError) {
        console.error('Error fetching owned restaurants:', ownerError);
        return { error: 'Failed to fetch restaurant data', status: 500 };
      }

      if (!ownedRestaurants || ownedRestaurants.length === 0) {
        return { error: 'No restaurant found for user', status: 404 };
      }

      return { 
        user, 
        restaurant: ownedRestaurants[0] 
      };
    }

    return { 
      user, 
      restaurant: userRestaurants[0].restaurants 
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return { 
      error: 'Authentication failed', 
      status: 500 
    };
  }
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
