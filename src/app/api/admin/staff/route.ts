import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';
import { validateUserAndGetRestaurant } from '../../../../../lib/api-route-helpers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error) {
      if (error === 'Missing user ID in headers') {
        return NextResponse.json(
          { error: 'Unauthorized - Missing user ID' },
          { status: 401 }
        );
      }
      if (error === 'No restaurant found for user') {
        return NextResponse.json(
          { error: 'No restaurant found for current user' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data' },
        { status: 500 }
      );
    }

    if (!user || !restaurant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get staff users with their category permissions
    const { data: staff, error: staffError } = await supabaseAdmin
      .from('staff_users')
      .select(`
        *,
        categories:user_category_permissions(
          category_id,
          can_edit,
          categories(name)
        )
      `)
      .eq('restaurant_id', restaurant.id)
      .order('name');

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return NextResponse.json({ error: 'Failed to fetch staff users' }, { status: 500 });
    }

    // Transform the data
    const transformedStaff = staff?.map(user => ({
      ...user,
      categories: user.categories?.map((cat: { category_id: number; can_edit: boolean; categories: { name: string } | null }) => ({
        category_id: cat.category_id,
        category_name: cat.categories?.name,
        can_edit: cat.can_edit
      })) || []
    }));

    return NextResponse.json(transformedStaff || []);

  } catch (error) {
    console.error('Error in staff GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { name, pin, role, category_permissions } = await request.json();

    if (!name || !pin || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error) {
      if (error === 'Missing user ID in headers') {
        return NextResponse.json(
          { error: 'Unauthorized - Missing user ID' },
          { status: 401 }
        );
      }
      if (error === 'No restaurant found for user') {
        return NextResponse.json(
          { error: 'No restaurant found for current user' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data' },
        { status: 500 }
      );
    }

    if (!user || !restaurant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Hash the PIN using simple SHA256
    const { createHash } = await import('crypto');
    const hashedPin = createHash('sha256').update(pin).digest('hex');

    // Create staff user
    const { data: staffUser, error: staffError } = await supabaseAdmin
      .from('staff_users')
      .insert({
        restaurant_id: restaurant.id,
        name,
        pin: hashedPin,
        role,
        created_by: user.id
      })
      .select()
      .single();

    if (staffError) {
      console.error('Error creating staff user:', staffError);
      return NextResponse.json({ error: 'Failed to create staff user' }, { status: 500 });
    }

    // Add category permissions
    if (category_permissions && category_permissions.length > 0) {
      const permissions = category_permissions.map((categoryId: number) => ({
        staff_user_id: staffUser.id,
        category_id: categoryId,
        can_edit: true,
        can_view: true,
        created_by: user.id
      }));

      const { error: permissionsError } = await supabaseAdmin
        .from('user_category_permissions')
        .insert(permissions);

      if (permissionsError) {
        console.error('Error creating permissions:', permissionsError);
        // Don't fail the whole operation, just log the error
      }
    }

    return NextResponse.json(staffUser);

  } catch (error) {
    console.error('Error in staff POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { id, name, pin, role, category_permissions } = await request.json();

    if (!id || !name || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error) {
      if (error === 'Missing user ID in headers') {
        return NextResponse.json(
          { error: 'Unauthorized - Missing user ID' },
          { status: 401 }
        );
      }
      if (error === 'No restaurant found for user') {
        return NextResponse.json(
          { error: 'No restaurant found for current user' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data' },
        { status: 500 }
      );
    }

    if (!user || !restaurant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prepare update data
    const updateData: {
      name: string;
      role: string;
      updated_at: string;
      pin?: string;
    } = {
      name,
      role,
      updated_at: new Date().toISOString()
    };

    // Hash PIN if provided
    if (pin) {
      const { data: hashedPin } = await supabaseAdmin
        .rpc('hash_pin', { pin });
      updateData.pin = hashedPin;
    }

    // Update staff user
    const { data: staffUser, error: staffError } = await supabaseAdmin
      .from('staff_users')
      .update(updateData)
      .eq('id', id)
      .eq('restaurant_id', restaurant.id)
      .select()
      .single();

    if (staffError) {
      console.error('Error updating staff user:', staffError);
      return NextResponse.json({ error: 'Failed to update staff user' }, { status: 500 });
    }

    // Update category permissions
    if (category_permissions) {
      // Delete existing permissions
      await supabaseAdmin
        .from('user_category_permissions')
        .delete()
        .eq('staff_user_id', id);

      // Add new permissions
      if (category_permissions.length > 0) {
        const permissions = category_permissions.map((categoryId: number) => ({
          staff_user_id: id,
          category_id: categoryId,
          can_edit: true,
          can_view: true,
          created_by: user.id
        }));

        const { error: permissionsError } = await supabaseAdmin
          .from('user_category_permissions')
          .insert(permissions);

        if (permissionsError) {
          console.error('Error updating permissions:', permissionsError);
          // Don't fail the whole operation
        }
      }
    }

    return NextResponse.json(staffUser);

  } catch (error) {
    console.error('Error in staff PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing staff user ID' }, { status: 400 });
    }

    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error) {
      if (error === 'Missing user ID in headers') {
        return NextResponse.json(
          { error: 'Unauthorized - Missing user ID' },
          { status: 401 }
        );
      }
      if (error === 'No restaurant found for user') {
        return NextResponse.json(
          { error: 'No restaurant found for current user' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch restaurant data' },
        { status: 500 }
      );
    }

    if (!user || !restaurant) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabaseAdmin
      .from('staff_users')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('restaurant_id', restaurant.id);

    if (deleteError) {
      console.error('Error deleting staff user:', deleteError);
      return NextResponse.json({ error: 'Failed to delete staff user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in staff DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
