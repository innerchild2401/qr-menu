import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { pin, restaurant_id } = await request.json();
    
    console.log('Staff login attempt:', { pin, restaurant_id });

    if (!pin || !restaurant_id) {
      return NextResponse.json({ error: 'PIN and restaurant ID required' }, { status: 400 });
    }

    // Find staff user by restaurant and PIN (simplified approach)
    const { data: staffUsers, error } = await supabaseAdmin
      .from('staff_users')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .eq('is_active', true);

    console.log('Staff users query result:', { staffUsers, error });

    if (error || !staffUsers || staffUsers.length === 0) {
      console.log('No staff users found for restaurant:', restaurant_id);
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Find the staff user with matching PIN (handle both bcrypt and SHA256)
    const staffUser = staffUsers.find(user => {
      // Check if PIN is bcrypt hashed (starts with $2a$ or $2b$)
      if (user.pin.startsWith('$2a$') || user.pin.startsWith('$2b$')) {
        const isMatch = bcrypt.compareSync(pin, user.pin);
        console.log('Bcrypt comparison:', { pin, hashedPin: user.pin, isMatch });
        return isMatch;
      }
      // Otherwise, assume it's SHA256 hashed
      const hashedPin = createHash('sha256').update(pin).digest('hex');
      const isMatch = user.pin === hashedPin;
      console.log('SHA256 comparison:', { pin, hashedPin, storedPin: user.pin, isMatch });
      return isMatch;
    });

    if (!staffUser) {
      console.log('No staff user found with matching PIN');
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    console.log('Staff user found:', { id: staffUser.id, name: staffUser.name });

    // Get user's accessible categories (simplified - get all categories for now)
    const { data: allCategories } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('restaurant_id', restaurant_id);

    // For now, give access to all categories
    const categories = allCategories?.map(cat => ({
      category_id: cat.id,
      category_name: cat.name,
      can_edit: true
    })) || [];

    // Log the login activity (optional - skip if table doesn't exist)
    try {
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
    } catch (logError) {
      console.log('Could not log activity (table may not exist):', logError);
    }

    // Return staff user info (without PIN)
    const { pin: _, ...staffInfo } = staffUser;
    
    return NextResponse.json({
      success: true,
      staff: staffInfo,
      categories: categories
    });

  } catch (error) {
    console.error('Staff login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
