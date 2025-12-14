import { NextRequest, NextResponse } from 'next/server';
import { validateUserAndGetRestaurant } from '../../../../../../lib/api-route-helpers';
import { supabaseAdmin } from '../../../../../../lib/supabase-server';

/**
 * Refresh session_ids for all tables
 * POST /api/admin/tables/refresh-session-ids
 */
export async function POST(request: NextRequest) {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error || !user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all tables for this restaurant
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from('tables')
      .select('id')
      .eq('restaurant_id', restaurant.id);

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 });
    }

    if (!tables || tables.length === 0) {
      return NextResponse.json({ message: 'No tables found', updated: 0 });
    }

    // Generate new session_id for each table
    let updated = 0;
    for (const table of tables) {
      const newSessionId = crypto.randomUUID();
      const { error: updateError } = await supabaseAdmin
        .from('tables')
        .update({
          session_id: newSessionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', table.id);

      if (updateError) {
        console.error(`Error updating table ${table.id}:`, updateError);
      } else {
        updated++;
      }
    }

    return NextResponse.json({ 
      message: `Successfully refreshed session_ids for ${updated} table(s)`,
      updated 
    });
  } catch (error) {
    console.error('Error in refresh session_ids:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

