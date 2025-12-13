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
    console.log('🔵 [PLACE ORDER] Starting place order for tableId:', tableId);

    // Check table status first
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, status')
      .eq('id', tableId)
      .single();

    if (tableError || !table) {
      console.error('❌ [PLACE ORDER] Table not found:', tableError);
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    console.log('✅ [PLACE ORDER] Table found:', { id: table.id, status: table.status });

    // Block placing order if table is unavailable
    if (table.status === 'out_of_service' || table.status === 'cleaning') {
      console.log('❌ [PLACE ORDER] 403 - Table unavailable:', table.status);
      return NextResponse.json(
        { error: 'This table is currently unavailable. Please contact staff if you need assistance.' },
        { status: 403 }
      );
    }

    // Get existing order (pending or processed - can place order on processed orders too)
    console.log('🔍 [PLACE ORDER] Looking for active order...');
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('table_orders')
      .select('*')
      .eq('table_id', tableId)
      .in('order_status', ['pending', 'processed'])
      .maybeSingle();

    console.log('📦 [PLACE ORDER] Order query result:', {
      found: !!order,
      orderId: order?.id,
      orderStatus: order?.order_status,
      itemCount: order?.order_items?.length || 0,
      error: fetchError?.message,
    });

    // If no active order exists, check if there's a closed order
    if (fetchError || !order) {
      console.log('⚠️ [PLACE ORDER] No active order found, checking for closed orders...');
      const { data: closedOrder } = await supabaseAdmin
        .from('table_orders')
        .select('id, order_status, restaurant_id, closed_at')
        .eq('table_id', tableId)
        .eq('order_status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('🔒 [PLACE ORDER] Closed order check:', {
        found: !!closedOrder,
        closedOrderId: closedOrder?.id,
      });

      if (closedOrder) {
        // Get restaurant name for error message
        const { data: restaurant } = await supabaseAdmin
          .from('restaurants')
          .select('name')
          .eq('id', closedOrder.restaurant_id)
          .single();

        console.log('❌ [PLACE ORDER] 403 - Found closed order:', {
          closedOrderId: closedOrder.id,
          closedAt: closedOrder.closed_at,
          restaurantName: restaurant?.name,
        });
        return NextResponse.json(
          { 
            error: 'This table order has been closed.',
            message: 'In order to start a new order, you need to scan the QR code on the table.',
            restaurantName: restaurant?.name || 'The restaurant'
          },
          { status: 403 }
        );
      }
      
      console.log('❌ [PLACE ORDER] No order found at all');
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

      console.log('❌ [PLACE ORDER] 403 - Order status is closed (unexpected):', {
        orderId: order.id,
        orderStatus: order.order_status,
        restaurantName: restaurant?.name,
      });
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
      console.log('❌ [PLACE ORDER] Order is empty');
      return NextResponse.json({ error: 'Order is empty' }, { status: 400 });
    }

    console.log('✅ [PLACE ORDER] Order found with items, placing order...', {
      orderId: order.id,
      itemCount: order.order_items.length,
      customerTokens: order.customer_tokens,
    });

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
      console.error('❌ [PLACE ORDER] Error placing order:', updateError);
      return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
    }

    console.log('✅ [PLACE ORDER] Order placed successfully:', updatedOrder.id);

    // Update table status to occupied
    const { error: tableUpdateError } = await supabaseAdmin
      .from('tables')
      .update({
        status: 'occupied',
        updated_at: new Date().toISOString(),
      })
      .eq('id', tableId);

    if (tableUpdateError) {
      console.error('⚠️ [PLACE ORDER] Error updating table status:', tableUpdateError);
    } else {
      console.log('✅ [PLACE ORDER] Table status updated to occupied');
    }

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('Error in place order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

