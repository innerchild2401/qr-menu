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
  try {
    console.log('🚀 Starting signup process...');
    
    // Step 1: Create the auth user
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
      console.error('❌ Auth signup error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('Failed to create user account');
    }

    console.log('✅ Auth user created successfully:', authData.user.id);

    // Step 2: Ensure user record exists in public.users table
    let userRecord = null;
    let attempts = 0;
    const maxAttempts = 10; // Increased retry attempts
    
    while (!userRecord && attempts < maxAttempts) {
      console.log(`🔄 Attempt ${attempts + 1}/${maxAttempts}: Checking for user record...`);
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', authData.user.id)
        .single();
      
      if (userData && !userError) {
        userRecord = userData;
        console.log('✅ User record found in public.users table');
        break;
      }
      
      // Wait longer between attempts (1 second)
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    // Step 3: Fallback - manually create user record if trigger failed
    if (!userRecord) {
      console.log('⚠️  Trigger failed to create user record, creating manually...');
      
      const { data: createdUser, error: createUserError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          full_name: data.full_name
        })
        .select()
        .single();
      
      if (createUserError) {
        console.error('❌ Failed to create user record manually:', createUserError);
        throw new Error(`Failed to create user profile: ${createUserError.message}`);
      }
      
      userRecord = createdUser;
      console.log('✅ User record created manually');
    }

    // Step 4: Create restaurant with proper error handling
    console.log('🏪 Creating restaurant...');
    
    const restaurantData = {
      name: data.restaurant_name,
      slug: generateSlug(data.restaurant_name),
      owner_id: authData.user.id
    };
    
    console.log('📋 Restaurant data:', restaurantData);
    
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert(restaurantData)
      .select()
      .single();

    if (restaurantError) {
      console.error('❌ Restaurant creation error:', restaurantError);
      
      // Provide more specific error messages
      if (restaurantError.code === '23503') {
        throw new Error(`Foreign key constraint violation: The user record may not exist. Please try signing in again.`);
      } else if (restaurantError.code === '23505') {
        throw new Error(`Restaurant with this name already exists. Please choose a different name.`);
      } else {
        throw new Error(`Failed to create restaurant: ${restaurantError.message}`);
      }
    }

    console.log('✅ Restaurant created successfully:', restaurant.id);

    // Step 5: Verify user-restaurant relationship was created
    console.log('🔗 Verifying user-restaurant relationship...');
    
    const { error: relationshipError } = await supabase
      .from('user_restaurants')
      .select('user_id, restaurant_id, role')
      .eq('user_id', authData.user.id)
      .eq('restaurant_id', restaurant.id)
      .single();
    
    if (relationshipError) {
      console.warn('⚠️  User-restaurant relationship not found, creating manually...');
      
      const { error: createRelError } = await supabase
        .from('user_restaurants')
        .insert({
          user_id: authData.user.id,
          restaurant_id: restaurant.id,
          role: 'owner'
        });
      
      if (createRelError) {
        console.error('❌ Failed to create user-restaurant relationship:', createRelError);
        // Don't throw error here as the restaurant was created successfully
      } else {
        console.log('✅ User-restaurant relationship created manually');
      }
    } else {
      console.log('✅ User-restaurant relationship verified');
    }

    // Step 6: Ensure the user is properly authenticated
    console.log('🔐 Ensuring user authentication...');
    
    // Check if we have a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      throw new Error('Failed to establish user session');
    }
    
    if (!session) {
      console.log('⚠️  No session found, attempting to sign in...');
      
      // Try to sign in with the credentials to establish session
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      
      if (signInError) {
        console.error('❌ Auto-signin failed:', signInError);
        throw new Error('Account created but failed to sign in automatically. Please sign in manually.');
      }
      
      console.log('✅ Auto-signin successful');
    } else {
      console.log('✅ User session already established');
    }

    console.log('🎉 Signup process completed successfully!');
    return { user: authData.user, restaurant };
    
  } catch (error) {
    console.error('❌ Signup process failed:', error);
    throw error;
  }
};

export const signIn = async (data: SignInData) => {
  try {
    console.log('🔐 Starting signin process...');
    
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      console.error('❌ Signin error:', error);
      
      // Provide more specific error messages
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Please check your email and confirm your account before signing in.');
      } else if (error.message.includes('Too many requests')) {
        throw new Error('Too many login attempts. Please wait a moment before trying again.');
      } else {
        throw new Error(`Sign in failed: ${error.message}`);
      }
    }

    if (!authData.user) {
      throw new Error('Sign in failed: No user data received');
    }

    console.log('✅ Signin successful:', authData.user.id);
    
    // Verify the session is established
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session verification error:', sessionError);
      throw new Error('Failed to establish user session');
    }
    
    if (!session) {
      console.error('❌ No session established after signin');
      throw new Error('Sign in successful but session not established. Please try again.');
    }
    
    console.log('✅ User session verified');
    return authData;
    
  } catch (error) {
    console.error('❌ Signin process failed:', error);
    throw error;
  }
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
