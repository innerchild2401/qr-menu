import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { env } from '@/lib/env';

/**
 * Table redirect endpoint - generates session_id and redirects to menu
 * GET /table-redirect?table=tableId&area=areaId
 * 
 * This endpoint is hit when scanning a QR code. It generates a new session_id
 * for the table and redirects to the menu page with the session_id in the URL.
 * This ensures session_id is only generated on QR scan, not on page refresh.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tableId = searchParams.get('table');
    const areaId = searchParams.get('area');

    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 });
    }

    // Get table info
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, restaurant_id, status, session_id')
      .eq('id', tableId)
      .single();

    if (tableError || !table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Get restaurant slug
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('slug')
      .eq('id', table.restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Block access if table is cleaning or out of service
    if (table.status === 'out_of_service' || table.status === 'cleaning') {
      // Redirect to menu without table params (will show unavailable message)
      const baseUrl = env.APP_URL || request.nextUrl.origin;
      return NextResponse.redirect(`${baseUrl}/menu/${restaurant.slug}`);
    }

    // Use existing session_id from table (set at QR generation or table creation)
    // DO NOT generate new session_id here - it should already exist
    if (!table.session_id) {
      console.error('❌ [TABLE REDIRECT] Table missing session_id - this should not happen');
      // Fallback: generate one, but this indicates a problem
      const fallbackSessionId = crypto.randomUUID();
      await supabaseAdmin
        .from('tables')
        .update({
          session_id: fallbackSessionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tableId);
      
      console.warn('⚠️ [TABLE REDIRECT] Generated fallback session_id:', fallbackSessionId);
      table.session_id = fallbackSessionId;
    }

    const sessionId = table.session_id;
    console.log('✅ [TABLE REDIRECT] Using existing session_id:', {
      tableId,
      sessionId,
      tableStatus: table.status,
    });

    // Build redirect URL with session_id
    const baseUrl = env.APP_URL || request.nextUrl.origin;
    const redirectUrl = new URL(`${baseUrl}/menu/${restaurant.slug}` as string);
    redirectUrl.searchParams.set('table', tableId);
    redirectUrl.searchParams.set('session', sessionId); // Add existing session_id to URL
    if (areaId) {
      redirectUrl.searchParams.set('area', areaId);
    }

    console.log('🔄 [TABLE REDIRECT] Redirecting to:', redirectUrl.toString());

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in table redirect:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

