import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Individual Table Management API
 * GET /api/admin/tables/[id] - Get table details
 * PUT /api/admin/tables/[id] - Update table
 * DELETE /api/admin/tables/[id] - Delete table
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    const { data: table, error } = await supabase
      .from('tables')
      .select(`
        *,
        area:areas (
          id,
          name,
          service_type
        )
      `)
      .eq('id', id)
      .eq('restaurant_id', userRestaurant.restaurant_id)
      .single();

    if (error) {
      console.error('Error fetching table:', error);
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error('Error in GET /api/admin/tables/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

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

    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    const { data: table, error } = await supabase
      .from('tables')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('restaurant_id', userRestaurant.restaurant_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating table:', error);
      return NextResponse.json(
        { error: 'Failed to update table', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ table });
  } catch (error) {
    console.error('Error in PUT /api/admin/tables/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    // Get table to get area_id for count update
    const { data: table } = await supabase
      .from('tables')
      .select('area_id')
      .eq('id', id)
      .eq('restaurant_id', userRestaurant.restaurant_id)
      .single();

    // Delete table
    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', userRestaurant.restaurant_id);

    if (error) {
      console.error('Error deleting table:', error);
      return NextResponse.json(
        { error: 'Failed to delete table', details: error.message },
        { status: 500 }
      );
    }

    // Update area table count if table existed
    if (table?.area_id) {
      await supabaseAdmin.rpc('decrement_area_table_count', { area_id: table.area_id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/tables/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

