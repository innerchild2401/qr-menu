import { NextRequest, NextResponse } from 'next/server';
import { validateUserAndGetRestaurant } from '../../../../../../../../lib/api-route-helpers';
import { supabaseAdmin } from '../../../../../../../../lib/supabase-server';

/**
 * Get visit history for a customer
 * GET /api/admin/crm/customers/[id]/visits
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

    // Get visits with table and area info
    const { data: visits, error: visitsError } = await supabaseAdmin
      .from('customer_visits')
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
      .order('visit_timestamp', { ascending: false })
      .limit(100);

    if (visitsError) {
      console.error('Error fetching visits:', visitsError);
      return NextResponse.json({ error: 'Failed to fetch visits' }, { status: 500 });
    }

    return NextResponse.json({ visits: visits || [] });
  } catch (error) {
    console.error('Error in visits GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

