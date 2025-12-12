import { NextRequest, NextResponse } from 'next/server';
import { validateUserAndGetRestaurant } from '../../../../../lib/api-route-helpers';
import { supabaseAdmin } from '../../../../../lib/supabase-server';

/**
 * Area Management API
 * GET /api/admin/areas - List all areas for a restaurant
 * POST /api/admin/areas - Create a new area
 */

export async function GET(request: NextRequest) {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error) {
      if (error === 'Missing user ID in headers') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error === 'No restaurant found for user') {
        return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch restaurant data' }, { status: 500 });
    }

    if (!user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: areas, error: areasError } = await supabaseAdmin
      .from('areas')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('name', { ascending: true });

    if (areasError) {
      console.error('Error fetching areas:', areasError);
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
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error) {
      if (error === 'Missing user ID in headers') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error === 'No restaurant found for user') {
        return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch restaurant data' }, { status: 500 });
    }

    if (!user || !restaurant) {
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

    const { data: area, error: insertError } = await supabaseAdmin
      .from('areas')
      .insert({
        restaurant_id: restaurant.id,
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

    if (insertError) {
      console.error('Error creating area:', insertError);
      return NextResponse.json(
        { error: 'Failed to create area', details: insertError.message },
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

