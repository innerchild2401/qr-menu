import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Track a customer event (product view, add to cart, etc.)
 * POST /api/crm/track-event
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      restaurantId,
      clientToken,
      eventType,
      eventData,
      tableId,
      areaId,
    } = body;

    if (!restaurantId || !clientToken || !eventType) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, clientToken, eventType' },
        { status: 400 }
      );
    }

    // Find customer by token
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('client_token', clientToken)
      .single();

    // Insert event (customer_id can be null for anonymous events)
    const { error } = await supabaseAdmin
      .from('customer_events')
      .insert({
        customer_id: customer?.id || null,
        restaurant_id: restaurantId,
        event_type: eventType,
        event_data: eventData || null,
        table_id: tableId || null,
        area_id: areaId || null,
        timestamp: new Date().toISOString(),
      });

    if (error) {
      console.error('Error tracking event:', error);
      return NextResponse.json(
        { error: 'Failed to track event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in track-event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

