import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { pin, restaurant_id } = await request.json();
    
    console.log('Staff login attempt:', { pin, restaurant_id });

    if (!pin || !restaurant_id) {
      return NextResponse.json({ error: 'PIN and restaurant ID required' }, { status: 400 });
    }

    // Use service role client to bypass RLS

    // Find staff user by restaurant (not by PIN initially)
    const { data: staffUser, error } = await supabaseAdmin
      .from('staff_users')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .eq('is_active', true)
      .single();

    console.log('Staff user query result:', { staffUser, error });

    if (error || !staffUser) {
      console.log('No staff user found for restaurant:', restaurant_id);
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Verify PIN
    const { data: pinValid, error: pinError } = await supabaseAdmin
      .rpc('verify_pin', { pin, hashed_pin: staffUser.pin });

    console.log('PIN verification result:', { pinValid, pinError, pin, hashedPin: staffUser.pin });

    if (pinError || !pinValid) {
      console.log('PIN verification failed');
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Get user's accessible categories
    const { data: categories } = await supabaseAdmin
      .rpc('get_user_categories', { user_id: staffUser.id });

    // Log the login activity
    await supabaseAdmin
      .from('staff_activity_log')
      .insert({
        staff_user_id: staffUser.id,
        action: 'login',
        details: { 
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') 
        }
      });

    // Return staff user info (without PIN)
    const { pin: _, ...staffInfo } = staffUser;
    
    return NextResponse.json({
      success: true,
      staff: staffInfo,
      categories: categories || []
    });

  } catch (error) {
    console.error('Staff login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
