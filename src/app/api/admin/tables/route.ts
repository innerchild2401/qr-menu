import { NextRequest, NextResponse } from 'next/server';
import { validateUserAndGetRestaurant } from '../../../../../lib/api-route-helpers';
import { supabaseAdmin } from '../../../../../lib/supabase-server';

/**
 * Table Management API
 * GET /api/admin/tables - List all tables for a restaurant
 * POST /api/admin/tables - Create a new table
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

    // Get tables with area information
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('tables')
      .select(`
        *,
        area:areas (
          id,
          name,
          service_type
        )
      `)
      .eq('restaurant_id', restaurant.id)
      .order('area_id', { ascending: true })
      .order('table_number', { ascending: true });

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return NextResponse.json(
        { error: 'Failed to fetch tables' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tables: tables || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/tables:', error);
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
      areaId,
      tableNumber,
      tableName,
      capacity,
      tableType = '4_top',
      floorPlanX,
      floorPlanY,
      floorPlanRotation = 0,
      notes,
    } = body;

    if (!areaId || !tableNumber || !capacity) {
      return NextResponse.json(
        { error: 'Missing required fields: areaId, tableNumber, capacity' },
        { status: 400 }
      );
    }

    // Validate area belongs to restaurant
    const { data: area } = await supabaseAdmin
      .from('areas')
      .select('id')
      .eq('id', areaId)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (!area) {
      return NextResponse.json({ error: 'Invalid area' }, { status: 400 });
    }

    // Create table with session_id (generated at creation)
    const newSessionId = crypto.randomUUID();
    const { data: table, error: insertError } = await supabaseAdmin
      .from('tables')
      .insert({
        restaurant_id: restaurant.id,
        area_id: areaId,
        table_number: tableNumber,
        table_name: tableName || null,
        capacity,
        table_type: tableType,
        status: 'available',
        session_id: newSessionId, // Generate session_id at table creation
        floor_plan_x: floorPlanX || null,
        floor_plan_y: floorPlanY || null,
        floor_plan_rotation: floorPlanRotation || 0,
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating table:', insertError);
      return NextResponse.json(
        { error: 'Failed to create table', details: insertError.message },
        { status: 500 }
      );
    }

    // Update area table count
    await supabaseAdmin.rpc('increment_area_table_count', { area_id: areaId });

    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/tables:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

