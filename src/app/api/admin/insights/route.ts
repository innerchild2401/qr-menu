import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { restaurantId, insight } = await request.json();

    if (!restaurantId || !insight) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID and insight data are required' },
        { status: 400 }
      );
    }

    // Verify user authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify restaurant ownership
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, user_id')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Save insight folder
    const { data: savedInsight, error: saveError } = await supabase
      .from('insight_folders')
      .insert({
        restaurant_id: restaurantId,
        title: `Insight Analysis - ${new Date().toLocaleDateString()}`,
        summary: insight.summary,
        data: insight,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('Save insight error:', saveError);
      return NextResponse.json(
        { success: false, error: 'Failed to save insight folder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: savedInsight.id,
        title: savedInsight.title,
        summary: savedInsight.summary,
        createdAt: savedInsight.created_at,
        data: savedInsight.data,
      },
    });

  } catch (error) {
    console.error('Save insight folder error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: 'Restaurant ID is required' },
        { status: 400 }
      );
    }

    // Verify user authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('sb-access-token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify restaurant ownership
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, user_id')
      .eq('id', restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Fetch insight folders
    const { data: insights, error: fetchError } = await supabase
      .from('insight_folders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Fetch insights error:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch insight folders' },
        { status: 500 }
      );
    }

    const formattedInsights = insights?.map(insight => ({
      id: insight.id,
      title: insight.title,
      summary: insight.summary,
      createdAt: insight.created_at,
      data: insight.data,
      isExpanded: false,
    })) || [];

    return NextResponse.json({
      success: true,
      data: formattedInsights,
    });

  } catch (error) {
    console.error('Fetch insight folders error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
