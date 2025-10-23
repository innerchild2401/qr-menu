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

    // Get user's accessible categories from permissions table
    const { data: userPermissions, error: permissionsError } = await supabaseAdmin
      .from('user_category_permissions')
      .select(`
        category_id,
        can_edit,
        can_view,
        categories!inner(id, name)
      `)
      .eq('staff_user_id', staffUser.id);

    console.log('User permissions query result:', { userPermissions, permissionsError });

    let categories = userPermissions?.map((permission: { category_id: number; can_edit: boolean; categories: { name: string }[] }) => ({
      category_id: permission.category_id,
      category_name: permission.categories?.[0]?.name || 'Unknown Category',
      can_edit: permission.can_edit
    })) || [];

    // If no permissions exist, create default permissions based on role
    if (categories.length === 0) {
      console.log('No permissions found, creating default permissions for role:', staffUser.role);
      
      // Get all categories for the restaurant
      const { data: allCategories } = await supabaseAdmin
        .from('categories')
        .select('id, name')
        .eq('restaurant_id', restaurant_id);

      if (allCategories && allCategories.length > 0) {
        // Create default permissions based on role
        const defaultPermissions = allCategories.map(cat => ({
          staff_user_id: staffUser.id,
          category_id: cat.id,
          can_edit: staffUser.role === 'manager' || staffUser.role === 'cook',
          can_view: true,
          created_by: staffUser.created_by
        }));

        // Insert default permissions
        const { error: permissionsError } = await supabaseAdmin
          .from('user_category_permissions')
          .insert(defaultPermissions);

        if (permissionsError) {
          console.error('Error creating default permissions:', permissionsError);
        } else {
          console.log('Default permissions created successfully');
          // Update categories with the new permissions
          categories = allCategories.map(cat => ({
            category_id: cat.id,
            category_name: cat.name,
            can_edit: staffUser.role === 'manager' || staffUser.role === 'cook'
          }));
        }
      }
    }

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
