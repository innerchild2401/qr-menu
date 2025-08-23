import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { supabaseAdmin, getRestaurantBySlug } from '../../../../../lib/supabase';
import type { Category } from '../../../../../lib/supabase';

interface ExtendedSession {
  user?: {
    email?: string | null;
  };
  restaurantSlug?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantSlug = session.restaurantSlug;

    // Get restaurant ID from slug
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get categories from Supabase
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error('Error fetching categories:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantSlug = session.restaurantSlug;

    // Get restaurant ID from slug
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const { name, description } = await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Get current max sort order
    const { data: maxOrderData } = await supabaseAdmin
      .from('categories')
      .select('sort_order')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = maxOrderData?.[0]?.sort_order ? maxOrderData[0].sort_order + 1 : 1;

    // Insert new category
    const { data: newCategory, error } = await supabaseAdmin
      .from('categories')
      .insert({
        restaurant_id: restaurant.id,
        name: name.trim(),
        description: description?.trim() || '',
        sort_order: nextSortOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      category: newCategory,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}