import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { supabaseAdmin, getRestaurantBySlug } from '../../../../../../lib/supabase-server';
import type { Popup } from '../../../../../../lib/supabase-server';

interface ExtendedSession {
  user?: {
    email?: string | null;
  };
  restaurantSlug?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
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

    // Update popup in Supabase
    const { data, error } = await supabaseAdmin
      .from('popups')
      .update({
        title: title.trim(),
        message: message.trim(),
        image: image?.trim() || null,
        cta_text: cta_text?.trim() || null,
        cta_url: cta_url?.trim() || null,
        active: Boolean(active),
        start_at: start_at || null,
        end_at: end_at || null,
        frequency,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('restaurant_id', restaurant.id) // Ensure user can only edit their own popups
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: 'Failed to update popup' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Popup not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      popup: data,
      message: 'Popup updated successfully'
    });
  } catch (error) {
    console.error('Error updating popup:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const restaurantSlug = session.restaurantSlug;

    // Get restaurant ID from slug
    const restaurant = await getRestaurantBySlug(restaurantSlug);
    if (!restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      );
    }

    // Delete popup from Supabase
    const { data, error } = await supabaseAdmin
      .from('popups')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurant.id) // Ensure user can only delete their own popups
      .select()
      .single();

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete popup' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Popup not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      popup: data,
      message: 'Popup deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting popup:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}