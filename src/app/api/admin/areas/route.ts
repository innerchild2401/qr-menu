import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Area Management API
 * GET /api/admin/areas - List all areas for a restaurant
 * POST /api/admin/areas - Create a new area
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Derive restaurant from membership
    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    const { data: areas, error } = await supabase
      .from('areas')
      .select('*')
      .eq('restaurant_id', userRestaurant.restaurant_id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching areas:', error);
      return NextResponse.json(
        { error: 'Failed to fetch areas' },
        { status: 500 }
      );
    }

    return NextResponse.json({ areas: areas || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/areas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      capacity,
      serviceType = 'full_service',
      operatingHours,
      floorPlanCoordinates,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required fields: name' },
        { status: 400 }
      );
    }

    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    const { data: area, error } = await supabase
      .from('areas')
      .insert({
        restaurant_id: userRestaurant.restaurant_id,
        name,
        description: description || null,
        capacity: capacity || null,
        service_type: serviceType,
        operating_hours: operatingHours || null,
        floor_plan_coordinates: floorPlanCoordinates || null,
        is_active: true,
        table_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating area:', error);
      return NextResponse.json(
        { error: 'Failed to create area', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ area }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/areas:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

