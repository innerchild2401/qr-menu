import { createClient } from '@supabase/supabase-js';

// Server-only Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';

// Admin client for server-side operations with elevated privileges
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

// Database types (based on actual Supabase schema)
export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  address?: string;
  schedule?: string;
  logo_url?: string; // Actual column name
  cover_url?: string; // Actual column name
  owner_id?: string; // Links to users.id
  created_at: string;
  // Note: description, qr_code_url, updated_at columns don't exist in actual schema
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  // Note: description, sort_order, updated_at columns don't exist in actual schema
}

export interface Product {
  id: string;
  restaurant_id: string;
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string; // Actual column name in database
  nutrition?: Record<string, unknown>; // JSON field
  created_at: string;
  // Note: available, sort_order, updated_at columns don't exist in actual schema
}

export interface Popup {
  id: string;
  restaurant_id: string;
  title: string;
  message: string;
  image?: string;
  cta_text?: string;
  cta_url?: string;
  active: boolean;
  start_at?: string;
  end_at?: string;
  frequency: 'once-per-session' | 'every-visit';
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRestaurant {
  user_id: string;
  restaurant_id: string;
  role: 'owner' | 'admin' | 'staff';
  created_at: string;
}

// Storage bucket names
export const STORAGE_BUCKETS = {
  LOGOS: 'logos',
  COVERS: 'covers',
  PRODUCTS: 'products',
  POPUPS: 'popups',
  QR_CODES: 'qr_codes',
} as const;

// Helper function to get public URL from Supabase Storage
export const getPublicUrl = (bucket: string, path: string): string => {
  const { data } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(path);
  
  return data.publicUrl;
};

// Helper function to upload file to Supabase Storage
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File | Buffer,
  options?: { contentType?: string; upsert?: boolean }
): Promise<{ data?: unknown; error?: unknown }> => {
  return await supabaseAdmin.storage
    .from(bucket)
    .upload(path, file, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? true,
    });
};

// Helper function to delete file from Supabase Storage
export const deleteFile = async (
  bucket: string,
  path: string
): Promise<{ data?: unknown; error?: unknown }> => {
  return await supabaseAdmin.storage
    .from(bucket)
    .remove([path]);
};

// Helper function to ensure restaurant exists and get ID
export const getRestaurantBySlug = async (slug: string): Promise<Restaurant | null> => {
  const { data, error } = await supabaseAdmin
    .from('restaurants')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) {
    console.error('Error fetching restaurant:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return data;
};

// Helper function to get restaurant with related data
export const getRestaurantWithData = async (slug: string) => {
  const restaurant = await getRestaurantBySlug(slug);
  
  if (!restaurant) {
    return null;
  }

  // Fetch categories and products in parallel
  const [categoriesResult, productsResult] = await Promise.all([
    supabaseAdmin
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id),
    
    supabaseAdmin
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurant.id),
  ]);

  if (categoriesResult.error) {
    console.error('Error fetching categories:', categoriesResult.error);
  }

  if (productsResult.error) {
    console.error('Error fetching products:', productsResult.error);
  }

  return {
    restaurant,
    categories: categoriesResult.data || [],
    products: productsResult.data || [],
  };
};

// Helper function to get active popups for a restaurant
export const getActivePopups = async (slug: string): Promise<Popup[]> => {
  const restaurant = await getRestaurantBySlug(slug);
  if (!restaurant) {
    return [];
  }

  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('popups')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('active', true)
    .or(`start_at.is.null,start_at.lte.${now}`)
    .or(`end_at.is.null,end_at.gte.${now}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching popups:', error);
    return [];
  }

  return data || [];
};
