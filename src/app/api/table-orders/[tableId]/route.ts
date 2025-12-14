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

    // Check table status and session
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, status, session_id')
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

    // Ensure table always has a session_id (security requirement)
    let sessionId = table.session_id;
    
    // If table doesn't have a session_id, generate one immediately
    // This should not happen for properly initialized tables, but handle it for safety
    if (!sessionId) {
      console.warn('⚠️ [GET ORDER] Table missing session_id, generating one');
      sessionId = crypto.randomUUID();
      const { error: updateError } = await supabaseAdmin
        .from('tables')
        .update({
          session_id: sessionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tableId);

      if (updateError) {
        console.error('Error updating table session:', updateError);
      } else {
        console.log('✅ [GET ORDER] Generated new session_id for table without one:', sessionId);
      }
    }
    
    // If table is available, generate a NEW session_id but DON'T mark as occupied yet
    // Table will only be marked as occupied when someone successfully adds items (POST with valid session)
    // This prevents marking table as occupied just from opening the browser directly
    if (table.status === 'available') {
      sessionId = crypto.randomUUID();
      
      // Update table with new session_id but keep status as 'available'
      // Status will change to 'occupied' only when POST succeeds with this session_id
      const { error: updateError } = await supabaseAdmin
        .from('tables')
        .update({
          session_id: sessionId,
          updated_at: new Date().toISOString(),
          // Keep status as 'available' - will be set to 'occupied' on first successful POST
        })
        .eq('id', tableId);

      if (updateError) {
        console.error('❌ [GET ORDER] Error updating table session:', updateError);
      } else {
        console.log('✅ [GET ORDER] Generated new session_id for available table:', sessionId);
      }
    }
    
    // If table is occupied and has session_id, use existing one (multiple customers can share same session)
    if (table.status === 'occupied' && sessionId) {
      console.log('✅ [GET ORDER] Using existing session_id for occupied table:', sessionId);
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

    console.log('📤 [GET ORDER] Returning response with sessionId:', {
      sessionId,
      tableStatus: table.status,
      hasOrder: !!order,
    });

    return NextResponse.json({ 
      order: order || null, 
      tableClosed: false,
      sessionId: sessionId || null // Return session_id to client - CRITICAL for client to store
    });
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
    const { restaurantId, areaId, items, customerToken, sessionId } = body;

    // Verify session_id
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select('id, status, session_id, updated_at')
      .eq('id', tableId)
      .single();

    if (tableError || !table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    if (!restaurantId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, items' },
        { status: 400 }
      );
    }

    // Block modifications if table is cleaning/out of service
    if (table.status === 'out_of_service' || table.status === 'cleaning') {
      return NextResponse.json(
        { error: 'This table is currently unavailable. Please contact staff if you need assistance.' },
        { status: 403 }
      );
    }

    // Ensure table always has a session_id (security requirement)
    // If table doesn't have one, generate it immediately
    if (!table.session_id) {
      console.warn('⚠️ [UPDATE CART] Table missing session_id, generating one');
      const newSessionId = crypto.randomUUID();
      const { error: updateError } = await supabaseAdmin
        .from('tables')
        .update({
          session_id: newSessionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tableId);

      if (updateError) {
        console.error('Error updating table session:', updateError);
      } else {
        // Update table object for use below
        table.session_id = newSessionId;
      }
    }

    // SECURITY: Always require session_id to match - no exceptions
    // If table has a session_id, client must provide matching sessionId
    if (table.session_id && (!sessionId || table.session_id !== sessionId)) {
      console.log('❌ [UPDATE CART] Session ID mismatch:', {
        clientSessionId: sessionId,
        tableSessionId: table.session_id,
        tableStatus: table.status,
      });
      // Get restaurant name for error message
      const { data: restaurant } = await supabaseAdmin
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single();

      return NextResponse.json(
        { 
          error: 'Invalid session. Please scan the QR code again.',
          message: 'In order to start a new order, you need to scan the QR code on the table.',
          restaurantName: restaurant?.name || 'The restaurant'
        },
        { status: 403, headers: { 'x-session-id': table.session_id || '' } }
      );
    }
    
    // If table doesn't have a session_id yet (should not happen, but handle it)
    if (!table.session_id) {
      console.warn('⚠️ [UPDATE CART] Table missing session_id, generating one and requiring QR scan');
      const newSessionId = crypto.randomUUID();
      await supabaseAdmin
        .from('tables')
        .update({
          session_id: newSessionId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tableId);
      
      const { data: restaurant } = await supabaseAdmin
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single();

      return NextResponse.json(
        { 
          error: 'Invalid session. Please scan the QR code again.',
          message: 'In order to start a new order, you need to scan the QR code on the table.',
          restaurantName: restaurant?.name || 'The restaurant'
        },
        { status: 403, headers: { 'x-session-id': newSessionId } }
      );
    }

    // Note: We don't check for closed orders here because:
    // - Closed orders are historical records and shouldn't block new orders
    // - After a table is closed (order_status='closed'), the table status is set to 'available'
    // - Customers scanning a new QR code should be able to create a new order
    // - The query below only looks for active orders (pending/processed), so closed orders are ignored

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

    console.log('📝 [UPDATE CART] Items to add:', {
      itemCount: items.length,
      items: items.map((item: { product_id: string; quantity: number; name: string }) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        name: item.name,
      })),
      customerToken,
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

    console.log('📦 [UPDATE CART] After processing items:', {
      finalItemCount: orderItems.length,
      finalItems: orderItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        name: item.name,
        customer_token: item.customer_token?.substring(0, 20) + '...',
        processed: item.processed,
      })),
    });

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal; // Add tax/service charge if needed

    // Get unique customer tokens
    const customerTokens = Array.from(
      new Set(orderItems.map((item) => item.customer_token).filter(Boolean))
    ) as string[];

    console.log('💰 [UPDATE CART] Calculated totals:', {
      subtotal,
      total,
      customerTokens: customerTokens.map((token) => token.substring(0, 20) + '...'),
    });

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

      // Mark table as occupied if it's currently available (first successful POST)
      if (table.status === 'available') {
        await supabaseAdmin
          .from('tables')
          .update({
            status: 'occupied',
            updated_at: new Date().toISOString(),
          })
          .eq('id', tableId);
        console.log('✅ [UPDATE CART] Table marked as occupied');
      }

      return NextResponse.json({ 
        order: updatedOrder,
        sessionId: table.session_id // Return session_id so client can store it
      });
    } else {
      // Create new order - but first check if there's a closed order that might conflict
      console.log('🆕 [UPDATE CART] Creating new order...', {
        restaurantId,
        tableId,
        areaId,
        itemCount: orderItems.length,
        customerTokens,
      });

      // Check for any existing order (including closed) to handle the unique constraint
      const { data: anyOrder } = await supabaseAdmin
        .from('table_orders')
        .select('id, order_status')
        .eq('table_id', tableId)
        .maybeSingle();

      if (anyOrder && anyOrder.order_status === 'closed') {
        // There's a closed order - we need to create a new one, but the unique constraint prevents it
        // Solution: Update the closed order to become a new pending order
        console.log('🔄 [UPDATE CART] Found closed order, converting to new pending order:', anyOrder.id);
        
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
          .from('table_orders')
          .update({
            order_items: orderItems,
            subtotal,
            total,
            customer_tokens: customerTokens,
            order_status: 'pending',
            placed_at: null, // Reset placed_at for new order
            processed_at: null,
            closed_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', anyOrder.id)
          .select()
          .single();

        if (updateError) {
          console.error('❌ [UPDATE CART] Error converting closed order:', updateError);
          return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
        }

        console.log('✅ [UPDATE CART] Closed order converted to new pending order:', {
          orderId: updatedOrder.id,
          status: updatedOrder.order_status,
          itemCount: updatedOrder.order_items.length,
        });

        // Mark table as occupied if it's currently available (first successful POST)
        if (table.status === 'available') {
          await supabaseAdmin
            .from('tables')
            .update({
              status: 'occupied',
              updated_at: new Date().toISOString(),
            })
            .eq('id', tableId);
          console.log('✅ [UPDATE CART] Table marked as occupied after converting closed order');
        }

        return NextResponse.json({ 
          order: updatedOrder,
          sessionId: table.session_id // Return session_id so client can store it
        });
      }

      // No existing order (or race condition) - try to create new one
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
        // If we get a unique constraint violation, it means another request created the order
        // Retry by fetching the existing order
        if (createError.code === '23505') {
          console.log('⚠️ [UPDATE CART] Race condition detected, fetching existing order...');
          
          const { data: existingOrder, error: fetchError } = await supabaseAdmin
            .from('table_orders')
            .select('*')
            .eq('table_id', tableId)
            .in('order_status', ['pending', 'processed'])
            .maybeSingle();

          if (fetchError || !existingOrder) {
            console.error('❌ [UPDATE CART] Error fetching order after race condition:', fetchError);
            return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
          }

          // Update the existing order with new items
          const existingItems = existingOrder.order_items || [];
          const mergedItems: Array<{
            product_id: string;
            quantity: number;
            price: number;
            name: string;
            customer_id?: string;
            customer_token?: string;
            processed?: boolean;
          }> = [...existingItems];
          
          items.forEach((item: { product_id: string; quantity: number; price: number; name: string }) => {
            const existingItemIndex = mergedItems.findIndex(
              (oi) => oi.product_id === item.product_id && oi.customer_token === customerToken
            );

            if (existingItemIndex >= 0) {
              mergedItems[existingItemIndex] = {
                ...mergedItems[existingItemIndex],
                quantity: item.quantity,
              };
            } else {
              mergedItems.push({
                ...item,
                customer_token: customerToken,
                processed: false,
              });
            }
          });

          const mergedItemsFiltered = mergedItems.filter((item) => item.quantity > 0);
          const mergedSubtotal = mergedItemsFiltered.reduce((sum: number, item) => sum + item.price * item.quantity, 0);
          const mergedTotal = mergedSubtotal;
          const mergedCustomerTokens = Array.from(new Set([
            ...(existingOrder.customer_tokens || []),
            customerToken,
          ]));

          const { data: updatedOrder, error: updateError } = await supabaseAdmin
            .from('table_orders')
            .update({
              order_items: mergedItemsFiltered,
              subtotal: mergedSubtotal,
              total: mergedTotal,
              customer_tokens: mergedCustomerTokens,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingOrder.id)
            .select()
            .single();

          if (updateError) {
            console.error('❌ [UPDATE CART] Error updating order after race condition:', updateError);
            return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
          }

          console.log('✅ [UPDATE CART] Order updated after race condition:', {
            orderId: updatedOrder.id,
            itemCount: updatedOrder.order_items.length,
          });

          // Mark table as occupied if it's currently available (first successful POST)
          if (table.status === 'available') {
            await supabaseAdmin
              .from('tables')
              .update({
                status: 'occupied',
                updated_at: new Date().toISOString(),
              })
              .eq('id', tableId);
            console.log('✅ [UPDATE CART] Table marked as occupied after race condition');
          }

          return NextResponse.json({ 
            order: updatedOrder,
            sessionId: table.session_id // Return session_id so client can store it
          });
        }

        console.error('❌ [UPDATE CART] Error creating table order:', createError);
        return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
      }

      console.log('✅ [UPDATE CART] Order created successfully:', {
        orderId: newOrder.id,
        status: newOrder.order_status,
        itemCount: newOrder.order_items.length,
      });

      // Mark table as occupied if it's currently available (first successful POST)
      if (table.status === 'available') {
        await supabaseAdmin
          .from('tables')
          .update({
            status: 'occupied',
            updated_at: new Date().toISOString(),
          })
          .eq('id', tableId);
        console.log('✅ [UPDATE CART] Table marked as occupied after order creation');
      }

      return NextResponse.json({ 
        order: newOrder,
        sessionId: table.session_id // Return session_id so client can store it
      });
    }
  } catch (error) {
    console.error('Error in table order POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

