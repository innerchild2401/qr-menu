import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Table Management API
 * GET /api/admin/tables - List all tables for a restaurant
 * POST /api/admin/tables - Create a new table
 */

export async function GET(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    // Get tables with area information
    const { data: tables, error } = await supabase
      .from('tables')
      .select(`
        *,
        area:areas (
          id,
          name,
          service_type
        )
      `)
      .eq('restaurant_id', userRestaurant.restaurant_id)
      .order('area_id', { ascending: true })
      .order('table_number', { ascending: true });

    if (error) {
      console.error('Error fetching tables:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tables' },
        { status: 500 }
      );
    }

    const jsonResponse = NextResponse.json({ tables: tables || [] });
    // Copy cookies from the supabase client response
    response.cookies.getAll().forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return jsonResponse;
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
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value,
              ...options,
            });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({
              name,
              value: '',
              ...options,
            });
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

    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    // Validate area belongs to restaurant
    const { data: area } = await supabase
      .from('areas')
      .select('id')
      .eq('id', areaId)
      .eq('restaurant_id', userRestaurant.restaurant_id)
      .single();

    if (!area) {
      return NextResponse.json({ error: 'Invalid area' }, { status: 400 });
    }

    // Create table
    const { data: table, error } = await supabase
      .from('tables')
      .insert({
        restaurant_id: userRestaurant.restaurant_id,
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
    await supabase.rpc('increment_area_table_count', { area_id: areaId });

    const jsonResponse = NextResponse.json({ table }, { status: 201 });
    // Copy cookies from the supabase client response
    response.cookies.getAll().forEach((cookie) => {
      jsonResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return jsonResponse;
  } catch (error) {
    console.error('Error in POST /api/admin/tables:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

