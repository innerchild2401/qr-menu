import { NextRequest, NextResponse } from 'next/server';
import { validateUserAndGetRestaurant } from '../../../../../../lib/api-route-helpers';
import { supabaseAdmin } from '../../../../../../lib/supabase-server';

// GET /api/admin/crm/customers - list customers for the user's restaurant
export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const segment = searchParams.get('segment')?.trim();
    const statusFilter = searchParams.get('status')?.trim();

    let query = supabaseAdmin
      .from('customers')
      .select('id, name, phone_number, total_visits, total_spent, last_seen_at, status, customer_segment, phone_shared_with_restaurant, tags')
      .eq('restaurant_id', restaurant.id)
      .order('last_seen_at', { ascending: false })
      .limit(200);

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,phone_number.ilike.%${search}%,anonymous_id.eq.${search}`
      );
    }

    if (segment) {
      query = query.eq('customer_segment', segment);
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data: customers, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching customers:', queryError);
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }

    return NextResponse.json({ customers: customers || [] });
  } catch (error) {
    console.error('Error in customers GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

