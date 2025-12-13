import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Place table order (finalize it)
 * POST /api/table-orders/[tableId]/place
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;

    // Check table status first
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, status')
      .eq('id', tableId)
      .single();

    if (tableError || !table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Block placing order if table is unavailable
    if (table.status === 'out_of_service' || table.status === 'cleaning') {
      return NextResponse.json(
        { error: 'This table is currently unavailable. Please contact staff if you need assistance.' },
        { status: 403 }
      );
    }

    // Get existing order (pending or processed - can place order on processed orders too)
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('table_orders')
      .select('*')
      .eq('table_id', tableId)
      .in('order_status', ['pending', 'processed'])
      .maybeSingle();

    // If no active order exists, check if there's a closed order
    if (fetchError || !order) {
      const { data: closedOrder } = await supabaseAdmin
        .from('table_orders')
        .select('id, order_status, restaurant_id')
        .eq('table_id', tableId)
        .eq('order_status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (closedOrder) {
        // Get restaurant name for error message
        const { data: restaurant } = await supabaseAdmin
          .from('restaurants')
          .select('name')
          .eq('id', closedOrder.restaurant_id)
          .single();

        return NextResponse.json(
          { 
            error: 'This table order has been closed.',
            message: 'In order to start a new order, you need to scan the QR code on the table.',
            restaurantName: restaurant?.name || 'The restaurant'
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json({ 
        error: 'No active order found. Please add items to your cart first.' 
      }, { status: 404 });
    }

    // Check if order is closed (shouldn't happen with the query above, but double-check)
    if (order.order_status === 'closed') {
      // Get restaurant name for error message
      const { data: restaurant } = await supabaseAdmin
        .from('restaurants')
        .select('name')
        .eq('id', order.restaurant_id)
        .single();

      return NextResponse.json(
        { 
          error: 'This table order has been closed.',
          message: 'In order to start a new order, you need to scan the QR code on the table.',
          restaurantName: restaurant?.name || 'The restaurant'
        },
        { status: 403 }
      );
    }

    if (!order.order_items || order.order_items.length === 0) {
      return NextResponse.json({ error: 'Order is empty' }, { status: 400 });
    }

    // Update order status and placed_at
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('table_orders')
      .update({
        placed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error placing order:', updateError);
      return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
    }

    // Update table status to occupied
    await supabaseAdmin
      .from('tables')
      .update({
        status: 'occupied',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tableId);

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error in place order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

