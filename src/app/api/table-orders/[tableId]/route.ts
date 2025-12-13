import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Get active order for a table
 * GET /api/table-orders/[tableId]
 */
export async function GET(
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

    // Block access if table is cleaning or out of service
    if (table.status === 'out_of_service' || table.status === 'cleaning') {
      return NextResponse.json({ 
        order: null, 
        tableClosed: true,
        message: 'This table is currently unavailable.'
      });
    }

    const { data: order, error } = await supabaseAdmin
      .from('table_orders')
      .select('*')
      .eq('table_id', tableId)
      .in('order_status', ['pending', 'processed'])
      .maybeSingle();

    if (error) {
      console.error('Error fetching table order:', error);
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }

    return NextResponse.json({ order: order || null, tableClosed: false });
  } catch (error) {
    console.error('Error in table order GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Create or update table order
 * POST /api/table-orders/[tableId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await params;
    const body = await request.json();
    const { restaurantId, areaId, items, customerToken } = body;

    if (!restaurantId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, items' },
        { status: 400 }
      );
    }

    // Check table status - only allow modifications if table is open
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, status')
      .eq('id', tableId)
      .single();

    if (tableError || !table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Block modifications if table is cleaning/out of service
    if (table.status === 'out_of_service' || table.status === 'cleaning') {
      return NextResponse.json(
        { error: 'This table is currently unavailable. Please contact staff if you need assistance.' },
        { status: 403 }
      );
    }

    // Check if there's a closed order (order was closed but table might be available for next customers)
    const { data: closedOrder } = await supabaseAdmin
      .from('table_orders')
      .select('id, order_status, restaurant_id, closed_at')
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

      console.log('❌ [UPDATE CART] 403 - Found closed order when trying to add items:', {
        closedOrderId: closedOrder.id,
        closedAt: closedOrder.closed_at,
        restaurantName: restaurant?.name,
      });
      return NextResponse.json(
        { 
          error: 'This table order has been closed.',
          message: `In order to start a new order, you need to scan the QR code on the table.`,
          restaurantName: restaurant?.name || 'The restaurant'
        },
        { status: 403 }
      );
    }

    // Get existing order or create new one
    console.log('🔵 [UPDATE CART] Looking for existing order for tableId:', tableId);
    const { data: existingOrder, error: existingOrderError } = await supabaseAdmin
      .from('table_orders')
      .select('*')
      .eq('table_id', tableId)
      .in('order_status', ['pending', 'processed'])
      .maybeSingle();

    console.log('📦 [UPDATE CART] Existing order check:', {
      found: !!existingOrder,
      orderId: existingOrder?.id,
      orderStatus: existingOrder?.order_status,
      itemCount: existingOrder?.order_items?.length || 0,
      customerTokens: existingOrder?.customer_tokens,
      error: existingOrderError?.message,
    });

    // Get existing order items and make a deep copy to avoid mutation issues
    let orderItems: Array<{
      product_id: string;
      quantity: number;
      price: number;
      name: string;
      customer_id?: string;
      customer_token?: string;
      processed?: boolean;
    }> = existingOrder?.order_items ? JSON.parse(JSON.stringify(existingOrder.order_items)) : [];

    // Add or update items from this customer
    items.forEach((item: {
      product_id: string;
      quantity: number;
      price: number;
      name: string;
    }) => {
      const existingItemIndex = orderItems.findIndex(
        (oi) => oi.product_id === item.product_id && oi.customer_token === customerToken
      );

      if (existingItemIndex >= 0) {
        // Update existing item - CRITICAL: preserve processed status exactly as it was
        const existingItem = orderItems[existingItemIndex];
        const wasProcessed = existingItem.processed === true; // Explicitly check for true
        
        orderItems[existingItemIndex] = {
          ...existingItem,
          quantity: item.quantity,
          processed: wasProcessed, // Preserve processed status - only true if it was explicitly true
        };
      } else {
        // Add new item - new items are NEVER processed automatically, regardless of order status
        orderItems.push({
          ...item,
          customer_token: customerToken,
          processed: false, // Always false for new items
        });
      }
    });

    // Remove items with quantity 0
    orderItems = orderItems.filter((item) => item.quantity > 0);

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal; // Add tax/service charge if needed

    // Get unique customer tokens
    const customerTokens = Array.from(
      new Set(orderItems.map((item) => item.customer_token).filter(Boolean))
    ) as string[];

    if (existingOrder) {
      // Update existing order
      console.log('🔄 [UPDATE CART] Updating existing order:', existingOrder.id);
      const { data: updatedOrder, error: updateError } = await supabaseAdmin
        .from('table_orders')
        .update({
          order_items: orderItems,
          subtotal,
          total,
          customer_tokens: customerTokens,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOrder.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ [UPDATE CART] Error updating table order:', updateError);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
      }

      console.log('✅ [UPDATE CART] Order updated successfully:', {
        orderId: updatedOrder.id,
        itemCount: updatedOrder.order_items.length,
        status: updatedOrder.order_status,
      });

      return NextResponse.json({ order: updatedOrder });
    } else {
      // Create new order
      console.log('🆕 [UPDATE CART] Creating new order...', {
        restaurantId,
        tableId,
        areaId,
        itemCount: orderItems.length,
        customerTokens,
      });

      const { data: newOrder, error: createError } = await supabaseAdmin
        .from('table_orders')
        .insert({
          restaurant_id: restaurantId,
          table_id: tableId,
          area_id: areaId || null,
          order_items: orderItems,
          subtotal,
          total,
          customer_tokens: customerTokens,
          order_status: 'pending',
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ [UPDATE CART] Error creating table order:', createError);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
      }

      console.log('✅ [UPDATE CART] Order created successfully:', {
        orderId: newOrder.id,
        status: newOrder.order_status,
        itemCount: newOrder.order_items.length,
      });

      return NextResponse.json({ order: newOrder });
    }
  } catch (error) {
    console.error('Error in table order POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

