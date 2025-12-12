import { NextRequest, NextResponse } from 'next/server';
import { validateUserAndGetRestaurant } from '../../../../../../../../lib/api-route-helpers';
import { supabaseAdmin } from '../../../../../../../../lib/supabase-server';

/**
 * Get order history for a customer
 * GET /api/admin/crm/customers/[id]/orders
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params;

    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error) {
      if (error === 'Missing user ID in headers') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error === 'No restaurant found for user') {
        return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch restaurant data' }, { status: 500 });
    }

    if (!user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify customer belongs to restaurant
    const { data: customer, error: customerError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get orders with table and area info
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('customer_orders')
      .select(`
        *,
        table:tables (
          id,
          table_number,
          table_name
        ),
        area:areas (
          id,
          name
        )
      `)
      .eq('customer_id', customerId)
      .order('placed_at', { ascending: false })
      .limit(100);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (error) {
    console.error('Error in orders GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

