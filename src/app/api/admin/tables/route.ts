import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Table Management API
 * GET /api/admin/tables - List all tables for a restaurant
 * POST /api/admin/tables - Create a new table
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

    // Get tables with area information
    const { data: tables, error } = await supabaseAdmin
      .from('tables')
      .select(`
        *,
        area:areas (
          id,
          name,
          service_type
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('area_id', { ascending: true })
      .order('table_number', { ascending: true });

    if (error) {
      console.error('Error fetching tables:', error);
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
    const body = await request.json();
    const {
      restaurantId,
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

    if (!restaurantId || !areaId || !tableNumber || !capacity) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, areaId, tableNumber, capacity' },
        { status: 400 }
      );
    }

    // Create table
    const { data: table, error } = await supabaseAdmin
      .from('tables')
      .insert({
        restaurant_id: restaurantId,
        area_id: areaId,
        table_number: tableNumber,
        table_name: tableName || null,
        capacity,
        table_type: tableType,
        status: 'available',
        floor_plan_x: floorPlanX || null,
        floor_plan_y: floorPlanY || null,
        floor_plan_rotation: floorPlanRotation || 0,
        notes: notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating table:', error);
      return NextResponse.json(
        { error: 'Failed to create table', details: error.message },
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

