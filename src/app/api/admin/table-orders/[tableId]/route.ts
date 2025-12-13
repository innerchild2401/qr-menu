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
      // Mark all unprocessed items as processed
      const orderItems = (order.order_items || []).map((item: { processed?: boolean }) => ({
        ...item,
        processed: true,
      }));

      updatedOrder = {
        ...order,
        order_items: orderItems,
        order_status: 'processed',
        processed_at: new Date().toISOString(),
      };
    } else if (action === 'process_new_items') {
      // Mark only new (unprocessed) items as processed
      const orderItems = (order.order_items || []).map((item: { processed?: boolean }) => ({
        ...item,
        processed: true, // Mark all items as processed (including previously unprocessed ones)
      }));

      updatedOrder = {
        ...order,
        order_items: orderItems,
        // Keep order_status as 'processed' if it was already processed
        order_status: 'processed',
        processed_at: order.processed_at || new Date().toISOString(),
      };
    } else if (action === 'close') {
      // Close the order and clear the table
      updatedOrder = {
        ...order,
        order_status: 'closed',
        closed_at: new Date().toISOString(),
      };

      // Update table status to available and generate new session_id (invalidates old sessions)
      const newSessionId = crypto.randomUUID();
      await supabaseAdmin
        .from('tables')
        .update({
          status: 'available',
          session_id: newSessionId, // Generate new session_id to invalidate old sessions
          updated_at: new Date().toISOString(),
        })
        .eq('id', tableId);
      
      // Create customer_orders for each customer that contributed to this order
      const customerTokens = order.customer_tokens || [];
      const orderItems = order.order_items || [];
      
      // Group items by customer_token
      const itemsByCustomer: Record<string, Array<{
        product_id: string;
        quantity: number;
        price: number;
        name: string;
      }>> = {};
      
      orderItems.forEach((item: { customer_token?: string; product_id: string; quantity: number; price: number; name: string }) => {
        if (item.customer_token) {
          if (!itemsByCustomer[item.customer_token]) {
            itemsByCustomer[item.customer_token] = [];
          }
          itemsByCustomer[item.customer_token].push({
            product_id: item.product_id,
            quantity: item.quantity,
            price: item.price,
            name: item.name,
          });
        }
      });

      // Create customer orders for each customer
      for (const customerToken of customerTokens) {
        const customerItems = itemsByCustomer[customerToken] || [];
        if (customerItems.length === 0) continue;

        // Find customer by client_token
        const { data: customer, error: customerError } = await supabaseAdmin
          .from('customers')
          .select('id')
          .eq('restaurant_id', restaurant.id)
          .eq('client_token', customerToken)
          .single();

        if (customerError || !customer) {
          console.warn(`Customer not found for token: ${customerToken.substring(0, 20)}...`);
          continue;
        }

        // Calculate customer's order total
        const customerSubtotal = customerItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        const customerTotal = customerSubtotal;

        // Create customer_order record
        const { error: orderError } = await supabaseAdmin
          .from('customer_orders')
          .insert({
            customer_id: customer.id,
            restaurant_id: restaurant.id,
            table_id: order.table_id,
            area_id: order.area_id || null,
            order_items: customerItems,
            subtotal: customerSubtotal,
            total: customerTotal,
            order_status: 'completed', // Mark as completed so trigger updates customer stats
            order_type: 'dine_in',
            placed_at: order.placed_at || new Date().toISOString(),
            completed_at: new Date().toISOString(),
          });

        if (orderError) {
          console.error(`Error creating customer order for customer ${customer.id}:`, orderError);
        } else {
          console.log(`✅ Created customer order for customer ${customer.id}`);
          
          // Manually update customer stats since trigger only fires on UPDATE, not INSERT
          // Calculate updated stats
          const { data: allOrders } = await supabaseAdmin
            .from('customer_orders')
            .select('total')
            .eq('customer_id', customer.id)
            .eq('order_status', 'completed');
          
          const newTotalSpent = (allOrders || []).reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
          const orderCount = (allOrders || []).length;
          const avgOrderValue = orderCount > 0 ? newTotalSpent / orderCount : 0;
          
          // Update customer stats
          await supabaseAdmin
            .from('customers')
            .update({
              total_spent: newTotalSpent,
              average_order_value: avgOrderValue,
              lifetime_value: newTotalSpent,
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', customer.id);
        }
      }
      
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

