import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Area Management API
 * GET /api/admin/areas - List all areas for a restaurant
 * POST /api/admin/areas - Create a new area
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'Missing restaurantId parameter' },
        { status: 400 }
      );
    }

    const { data: areas, error } = await supabaseAdmin
      .from('areas')
      .select('*')
      .eq('restaurant_id', restaurantId)
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
    const body = await request.json();
    const {
      restaurantId,
      name,
      description,
      capacity,
      serviceType = 'full_service',
      operatingHours,
      floorPlanCoordinates,
    } = body;

    if (!restaurantId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, name' },
        { status: 400 }
      );
    }

    const { data: area, error } = await supabaseAdmin
      .from('areas')
      .insert({
        restaurant_id: restaurantId,
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

