import { NextRequest, NextResponse } from 'next/server';
import { validateUserAndGetRestaurant } from '../../../../../../lib/api-route-helpers';
import { supabaseAdmin } from '../../../../../../lib/supabase-server';

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

    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error || !user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: table, error: tableError } = await supabaseAdmin
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
      .eq('restaurant_id', restaurant.id)
      .single();

    if (tableError) {
      console.error('Error fetching table:', tableError);
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

    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error || !user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: table, error: updateError } = await supabaseAdmin
      .from('tables')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('restaurant_id', restaurant.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating table:', updateError);
      return NextResponse.json(
        { error: 'Failed to update table', details: updateError.message },
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

    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error || !user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get table to get area_id for count update
    const { data: table } = await supabaseAdmin
      .from('tables')
      .select('area_id')
      .eq('id', id)
      .eq('restaurant_id', restaurant.id)
      .single();

    // Delete table
    const { error: deleteError } = await supabaseAdmin
      .from('tables')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurant.id);

    if (deleteError) {
      console.error('Error deleting table:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete table', details: deleteError.message },
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

