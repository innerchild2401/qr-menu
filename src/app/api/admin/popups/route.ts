import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserAndRestaurant } from '../../../../../lib/currentRestaurant';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import type { Popup } from '../../../../../lib/supabase-server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current user and restaurant using unified resolver
    const { user, restaurant, error } = await getCurrentUserAndRestaurant();
    
    if (error || !user || !restaurant) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: error === 'No restaurant found' ? 404 : 401 }
      );
    }

    // Get all popups for the current restaurant
    const { data: popups, error: popupsError } = await supabaseAdmin
      .from('popups')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (popupsError) {
      console.error('Supabase error:', popupsError);
      return NextResponse.json(
        { error: 'Failed to fetch popups' },
        { status: 500 }
      );
    }

    return NextResponse.json({ popups: popups || [] });
  } catch (error) {
    console.error('Error fetching popups:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get current user and restaurant using unified resolver
    const { user, restaurant, error } = await getCurrentUserAndRestaurant();
    
    if (error || !user || !restaurant) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: error === 'No restaurant found' ? 404 : 401 }
      );
    }

    // Parse request body
    const { 
      title, 
      message, 
      image_url, 
      cta_text, 
      cta_url, 
      active, 
      start_at, 
      end_at, 
      frequency 
    } = await request.json();

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Create new popup
    const { data: popup, error: createError } = await supabaseAdmin
      .from('popups')
      .insert({
        title: title.trim(),
        message: message.trim(),
        image_url: image_url || null,
        cta_text: cta_text || null,
        cta_url: cta_url || null,
        active: active !== undefined ? active : true,
        start_at: start_at || null,
        end_at: end_at || null,
        frequency: frequency || 'once-per-session',
        restaurant_id: restaurant.id
      })
      .select()
      .single();

    if (createError) {
      console.error('Supabase error:', createError);
      return NextResponse.json(
        { error: 'Failed to create popup' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      popup,
      message: 'Popup created successfully' 
    });
  } catch (error) {
    console.error('Error creating popup:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}