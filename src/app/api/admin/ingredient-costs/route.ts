import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
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

    // Get user's restaurant
    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    const { data: ingredients, error } = await supabase
      .from('ingredient_costs')
      .select('*')
      .order('ingredient_name');

    if (error) {
      console.error('Error fetching ingredient costs:', error);
      return NextResponse.json({ error: 'Failed to fetch ingredient costs' }, { status: 500 });
    }

    return NextResponse.json(ingredients || []);

  } catch (error) {
    console.error('Error in ingredient costs GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { ingredient_name, cost_per_unit, unit, currency } = await request.json();

    if (!ingredient_name || !cost_per_unit || !unit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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

    // Get user's restaurant
    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('ingredient_costs')
      .insert({
        ingredient_name,
        cost_per_unit,
        unit,
        currency: currency || (await import('@/lib/config')).getDefaultCurrency(),
        language: (await import('@/lib/config')).getDefaultLanguage(),
        confidence_score: 1.0,
        source: 'manual'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ingredient cost:', error);
      return NextResponse.json({ error: 'Failed to create ingredient cost' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in ingredient costs POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, ingredient_name, cost_per_unit, unit, currency } = await request.json();

    if (!id || !ingredient_name || !cost_per_unit || !unit) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

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

    const { data, error } = await supabase
      .from('ingredient_costs')
      .update({
        ingredient_name,
        cost_per_unit,
        unit,
        currency: currency || (await import('@/lib/config')).getDefaultCurrency(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ingredient cost:', error);
      return NextResponse.json({ error: 'Failed to update ingredient cost' }, { status: 500 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Error in ingredient costs PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ingredient ID' }, { status: 400 });
    }

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

    const { error } = await supabase
      .from('ingredient_costs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ingredient cost:', error);
      return NextResponse.json({ error: 'Failed to delete ingredient cost' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in ingredient costs DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

