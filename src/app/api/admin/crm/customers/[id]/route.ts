import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// GET /api/admin/crm/customers/[id] - fetch a single customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', userRestaurant.restaurant_id)
      .single();

    if (error || !customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error in customer GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/admin/crm/customers/[id] - update customer fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      phone_number,
      email,
      address,
      notes,
      tags,
      phone_shared_with_restaurant,
    } = body;

    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        name: name ?? null,
        phone_number: phone_number ?? null,
        email: email ?? null,
        address: address ?? null,
        notes: notes ?? null,
        tags: tags ?? null,
        phone_shared_with_restaurant: phone_shared_with_restaurant ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('restaurant_id', userRestaurant.restaurant_id)
      .select('*')
      .single();

    if (error || !customer) {
      console.error('Error updating customer:', error);
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error in customer PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

