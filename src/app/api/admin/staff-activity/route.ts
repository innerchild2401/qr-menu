import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { validateUserAndGetRestaurant } from '../../../../../lib/api-route-helpers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);

    if (error) {
      if (error === 'Missing user ID in headers') {
        return NextResponse.json(
          { error: 'Unauthorized - Missing user ID' },
          { status: 401 }
        );
      }
      if (error === 'No restaurant found for user') {
        return NextResponse.json(
          { error: 'No restaurant found for current user' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data' },
        { status: 500 }
      );
    }

    if (!user || !restaurant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get staff activity for this restaurant
    const { data: activities, error: activitiesError } = await supabaseAdmin
      .from('staff_activity_log')
      .select(`
        id,
        action,
        product_id,
        details,
        created_at,
        staff_users!inner(
          id,
          name,
          role,
          restaurant_id
        )
      `)
      .eq('staff_users.restaurant_id', restaurant.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (activitiesError) {
      console.error('Error fetching staff activities:', activitiesError);
      return NextResponse.json({ error: 'Failed to fetch staff activities' }, { status: 500 });
    }

    // Get product names for recipe edits
    const productIds = activities
      ?.filter(activity => activity.product_id)
      .map(activity => activity.product_id) || [];

    let productNames: Record<number, string> = {};
    if (productIds.length > 0) {
      const { data: products } = await supabaseAdmin
        .from('products')
        .select('id, name')
        .in('id', productIds);

      productNames = products?.reduce((acc, product) => {
        acc[product.id] = product.name;
        return acc;
      }, {} as Record<number, string>) || {};
    }

    // Transform the data
    const transformedActivities = activities?.map(activity => ({
      id: activity.id,
      action: activity.action,
      product_id: activity.product_id,
      product_name: activity.product_id ? productNames[activity.product_id] : null,
      details: activity.details,
      created_at: activity.created_at,
      staff_user: {
        id: activity.staff_users?.[0]?.id || '',
        name: activity.staff_users?.[0]?.name || 'Unknown Staff',
        role: activity.staff_users?.[0]?.role || 'Unknown'
      }
    })) || [];

    return NextResponse.json(transformedActivities);

  } catch (error) {
    console.error('Error in staff activity GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
