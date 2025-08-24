import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzYwOTIsImV4cCI6MjA3MTU1MjA5Mn0.Lug4smvqk5sI-46MbFeh64Yu2nptehnUTlUCPSpYbqI';

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  full_name?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  restaurant_name: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Auth functions
export const signUp = async (data: SignUpData) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
      }
    }
  });

  if (authError) {
    throw new Error(authError.message);
  }

  if (authData.user) {
    // Wait a moment for the trigger to create the user record in the users table
    // Then verify the user exists before creating the restaurant
    let userExists = false;
    let attempts = 0;
    const maxAttempts = 5;
    
    while (!userExists && attempts < maxAttempts) {
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authData.user.id)
        .single();
      
      if (userRecord && !userError) {
        userExists = true;
        break;
      }
      
      // Wait 500ms before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    if (!userExists) {
      // Fallback: manually create the user record if the trigger failed
      const { error: createUserError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          full_name: data.full_name
        });
      
      if (createUserError) {
        throw new Error(`Failed to create user record: ${createUserError.message}`);
      }
      
      console.log('User record created manually due to trigger failure.');
    }

    // Create restaurant for the new user with owner_id
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: data.restaurant_name,
        slug: generateSlug(data.restaurant_name),
        owner_id: authData.user.id
      })
      .select()
      .single();

    if (restaurantError) {
      throw new Error(`Failed to create restaurant: ${restaurantError.message}`);
    }

    // The user_restaurants relationship is automatically created by the database trigger
    // when owner_id is set during restaurant creation
    console.log('Restaurant created successfully and linked to user via owner_id.');

    return { user: authData.user, restaurant };
  }

  throw new Error('Failed to create user');
};

export const signIn = async (data: SignInData) => {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return authData;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
};

export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw new Error(error.message);
  }

  return user;
};

// Helper function to get the current authenticated user with proper error handling
export const getAuthenticatedUser = async () => {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('No authenticated user found. Please sign in.');
  }
  
  return user;
};

export const getUserRestaurants = async (userId: string) => {
  const { data, error } = await supabase
    .rpc('get_user_restaurants', { user_uuid: userId });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// Helper function to generate restaurant slug
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
};

// Function to create a restaurant for the authenticated user
export const createRestaurant = async (restaurantData: { name: string; address?: string; schedule?: Record<string, unknown> }) => {
  const user = await getAuthenticatedUser();
  
  // Verify user exists in users table
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();
  
  if (userError || !userRecord) {
    throw new Error('User record not found. Please try signing out and signing in again.');
  }
  
  // Create restaurant with owner_id
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .insert({
      name: restaurantData.name,
      slug: generateSlug(restaurantData.name),
      address: restaurantData.address,
      schedule: restaurantData.schedule,
      owner_id: user.id
    })
    .select()
    .single();
  
  if (restaurantError) {
    throw new Error(`Failed to create restaurant: ${restaurantError.message}`);
  }
  
  return restaurant;
};
