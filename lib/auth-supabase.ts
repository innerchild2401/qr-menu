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
