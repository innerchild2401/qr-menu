import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserAndRestaurant } from '../../../../../../lib/currentRestaurant';
import { supabaseAdmin } from '../../../../../../lib/supabase-server';
import type { Popup } from '../../../../../../lib/supabase-server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Get current user and restaurant using unified resolver
    const { user, restaurant, error } = await getCurrentUserAndRestaurant();
    
    if (error || !user || !restaurant) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: error === 'No restaurant found' ? 404 : 401 }
      );
    }

    const { id } = await params;

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

    // Update popup in Supabase
    const { data, error: updateError } = await supabaseAdmin
      .from('popups')
      .update({
        title: title.trim(),
        message: message.trim(),
        image_url: image_url || null,
        cta_text: cta_text || null,
        cta_url: cta_url || null,
        active: active !== undefined ? active : true,
        start_at: start_at || null,
        end_at: end_at || null,
        frequency: frequency || 'once-per-session'
      })
      .eq('id', id)
      .eq('restaurant_id', restaurant.id) // Ensure user owns this popup
      .select()
      .single();

    if (updateError) {
      console.error('Supabase error:', updateError);
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
    // Get current user and restaurant using unified resolver
    const { user, restaurant, error } = await getCurrentUserAndRestaurant();
    
    if (error || !user || !restaurant) {
      return NextResponse.json(
        { error: error || 'Unauthorized' },
        { status: error === 'No restaurant found' ? 404 : 401 }
      );
    }

    const { id } = await params;

    // Delete popup from Supabase
    const { error: deleteError } = await supabaseAdmin
      .from('popups')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurant.id); // Ensure user owns this popup

    if (deleteError) {
      console.error('Supabase error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete popup' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
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