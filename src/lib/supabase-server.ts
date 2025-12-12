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

// CRM Types
export interface Area {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  capacity?: number;
  table_count?: number;
  service_type?: 'full_service' | 'bar_service' | 'counter';
  operating_hours?: Record<string, unknown>;
  floor_plan_coordinates?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Table {
  id: string;
  restaurant_id: string;
  area_id: string;
  table_number: string;
  table_name?: string;
  capacity: number;
  table_type?: '2_top' | '4_top' | '6_top' | 'booth' | 'bar_stool' | 'large_party';
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service';
  qr_code_url?: string;
  qr_code_path?: string;
  floor_plan_x?: number;
  floor_plan_y?: number;
  floor_plan_rotation?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  restaurant_id: string;
  anonymous_id: string;
  client_fingerprint_id?: string;
  client_token?: string;
  // Optional personal information
  phone_number?: string;
  name?: string;
  email?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  // Tracking
  first_seen_at: string;
  last_seen_at: string;
  total_visits: number;
  total_spent: number;
  average_order_value: number;
  lifetime_value: number;
  // Preferences
  preferred_category?: string;
  preferred_area_id?: string;
  preferred_table_id?: string;
  // Segmentation & Loyalty
  customer_segment?: string;
  loyalty_tier: string;
  loyalty_points: number;
  status: 'active' | 'at-risk' | 'lost';
  phone_shared_with_restaurant: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerVisit {
  id: string;
  customer_id: string;
  restaurant_id: string;
  table_id?: string;
  area_id?: string;
  visit_timestamp: string;
  device_info?: Record<string, unknown>;
  referrer?: string;
  session_duration?: number;
  menu_views: number;
  products_viewed?: string[];
  order_placed: boolean;
  order_id?: string;
  order_value?: number;
  qr_code_type?: 'table' | 'area' | 'general' | 'campaign';
  qr_code_campaign?: string;
  created_at: string;
}

export interface CustomerOrder {
  id: string;
  customer_id: string;
  restaurant_id: string;
  table_id?: string;
  area_id?: string;
  visit_id?: string;
  order_items: Array<{
    product_id: string;
    quantity: number;
    price: number;
    name: string;
  }>;
  subtotal: number;
  total: number;
  payment_method?: string;
  order_status: 'pending' | 'completed' | 'cancelled';
  order_type: 'dine_in' | 'delivery' | 'takeout';
  placed_at: string;
  completed_at?: string;
  whatsapp_token?: string;
  whatsapp_phone?: string;
  created_at: string;
}

export interface CustomerEvent {
  id: string;
  customer_id?: string;
  restaurant_id: string;
  event_type: string;
  event_data?: Record<string, unknown>;
  table_id?: string;
  area_id?: string;
  timestamp: string;
  created_at: string;
}

export interface WhatsAppOrderToken {
  id: string;
  restaurant_id: string;
  token: string;
  customer_id?: string;
  table_id?: string;
  area_id?: string;
  order_type: 'dine_in' | 'delivery';
  campaign?: string;
  order_data: Record<string, unknown>;
  phone_number?: string;
  phone_shared: boolean;
  status: 'pending' | 'received' | 'processed' | 'expired';
  expires_at: string;
  created_at: string;
  processed_at?: string;
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
