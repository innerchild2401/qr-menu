import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { supabaseAdmin, getRestaurantBySlug } from '../../../../../lib/supabase';
import type { Popup } from '../../../../../lib/supabase';

interface ExtendedSession {
  user?: {
    email?: string | null;
  };
  restaurantSlug?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantSlug = session.restaurantSlug;

    // Get restaurant ID from slug
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Get all popups from Supabase (no filtering for admin)
    const { data: popups, error } = await supabaseAdmin
      .from('popups')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
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
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantSlug = session.restaurantSlug;

    // Get restaurant ID from slug
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const { 
      title, 
      message, 
      image, 
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
        { error: 'Popup title is required' },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Popup message is required' },
        { status: 400 }
      );
    }

    if (!frequency || !['once-per-session', 'every-visit'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Valid frequency is required (once-per-session or every-visit)' },
        { status: 400 }
      );
    }

    // Validate dates if provided
    if (start_at && end_at) {
      const startDate = new Date(start_at);
      const endDate = new Date(end_at);
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Insert new popup
    const { data: newPopup, error } = await supabaseAdmin
      .from('popups')
      .insert({
        restaurant_id: restaurant.id,
        title: title.trim(),
        message: message.trim(),
        image: image?.trim() || null,
        cta_text: cta_text?.trim() || null,
        cta_url: cta_url?.trim() || null,
        active: Boolean(active),
        start_at: start_at || null,
        end_at: end_at || null,
        frequency
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create popup' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      popup: newPopup,
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