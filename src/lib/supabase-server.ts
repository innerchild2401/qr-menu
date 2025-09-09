import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// Server-only Supabase configuration - requires environment variables to be set

// Admin client for server-side operations with elevated privileges
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
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
  currency?: string; // Currency for menu prices: RON, EUR, USD, GBP
  nutrition_language?: string; // Language for nutritional values: EN, RO, FR, DE, ES
  // Google Business Profile integration
  google_business_location_id?: string;
  google_business_access_token?: string;
  google_business_refresh_token?: string;
  google_business_token_expires_at?: string;
  google_business_place_id?: string;
  google_business_rating?: number;
  google_business_review_count?: number;
  google_business_last_sync?: string;
  created_at: string;
  // Note: description, qr_code_url, updated_at columns don't exist in actual schema
}

export interface Category {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order?: number;
  created_at: string;
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
  available?: boolean;
  sort_order?: number;
  is_frozen?: boolean; // Indicates if the product comes from frozen ingredients
  is_vegetarian?: boolean; // Indicates if the product is vegetarian
  is_spicy?: boolean; // Indicates if the product is spicy
  has_recipe?: boolean; // Indicates if the product has a recipe (for AI generation)
  created_at: string;
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
  CATEGORIES: 'categories',
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
