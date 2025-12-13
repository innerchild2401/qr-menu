import { NextRequest, NextResponse } from 'next/server';
import { validateUserAndGetRestaurant } from '../../../../../../lib/api-route-helpers';
import { supabaseAdmin } from '../../../../../../lib/supabase-server';

/**
 * Get table order for admin
 * GET /api/admin/table-orders/[tableId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;

    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error || !user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: order, error: fetchError } = await supabaseAdmin
      .from('table_orders')
      .select(`
        *,
        table:tables (
          id,
          table_number,
          table_name,
          capacity
        ),
        area:areas (
          id,
          name
        )
      `)
      .eq('table_id', tableId)
      .eq('restaurant_id', restaurant.id)
      .in('order_status', ['pending', 'processed'])
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching table order:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }

    return NextResponse.json({ order: order || null });
  } catch (error) {
    console.error('Error in admin table order GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Update table order (remove items, process, close)
 * PATCH /api/admin/table-orders/[tableId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const body = await request.json();
    const { action, itemId } = body; // action: 'remove_item', 'process', 'close'

    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error || !user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get existing order
    const { data: order, error: fetchError } = await supabaseAdmin
      .from('table_orders')
      .select('*')
      .eq('table_id', tableId)
      .eq('restaurant_id', restaurant.id)
      .in('order_status', ['pending', 'processed'])
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let updatedOrder = { ...order };

    if (action === 'remove_item' && itemId) {
      // Remove item from order
      const orderItems = (order.order_items || []).filter(
        (item: { product_id: string }) => item.product_id !== itemId
      );

      const subtotal = orderItems.reduce(
        (sum: number, item: { price: number; quantity: number }) =>
          sum + item.price * item.quantity,
        0
      );

      updatedOrder = {
        ...order,
        order_items: orderItems,
        subtotal,
        total: subtotal,
      };
    } else if (action === 'process') {
      // Mark order as processed
      updatedOrder = {
        ...order,
        order_status: 'processed',
        processed_at: new Date().toISOString(),
      };
    } else if (action === 'close') {
      // Close the order and clear the table
      updatedOrder = {
        ...order,
        order_status: 'closed',
        closed_at: new Date().toISOString(),
      };

      // Update table status to available (this will block all client modifications)
      await supabaseAdmin
        .from('tables')
        .update({
          status: 'available',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tableId);
      
      // Note: table_orders record stays in DB for history/review
      // Clients won't see it because we filter by order_status !== 'closed'
    }

    // Update order
    const { data: finalOrder, error: updateError } = await supabaseAdmin
      .from('table_orders')
      .update(updatedOrder)
      .eq('id', order.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating table order:', updateError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    return NextResponse.json({ order: finalOrder });
  } catch (error) {
    console.error('Error in admin table order PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

