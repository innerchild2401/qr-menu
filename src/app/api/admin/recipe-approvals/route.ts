import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-server';
import { validateUserAndGetRestaurant } from '../../../../../lib/api-route-helpers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);

    if (error) {
      return NextResponse.json({ error }, { status: error === 'Missing user ID in headers' ? 401 : 500 });
    }

    if (!user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending recipe approvals for this restaurant
    const { data: approvals, error: approvalsError } = await supabaseAdmin
      .from('recipe_approvals')
      .select(`
        id,
        product_id,
        proposed_recipe,
        current_recipe,
        status,
        admin_notes,
        created_at,
        reviewed_at,
        staff_users!inner(
          id,
          name,
          role,
          restaurant_id
        ),
        products!inner(
          id,
          name,
          restaurant_id
        )
      `)
      .eq('products.restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (approvalsError) {
      console.error('Error fetching recipe approvals:', approvalsError);
      return NextResponse.json({ error: 'Failed to fetch recipe approvals' }, { status: 500 });
    }

    // Transform the data
    const transformedApprovals = approvals?.map(approval => ({
      id: approval.id,
      product_id: approval.product_id,
      product_name: approval.products?.[0]?.name || 'Unknown Product',
      proposed_recipe: approval.proposed_recipe,
      current_recipe: approval.current_recipe,
      status: approval.status,
      admin_notes: approval.admin_notes,
      created_at: approval.created_at,
      reviewed_at: approval.reviewed_at,
      staff_user: {
        id: approval.staff_users?.[0]?.id || '',
        name: approval.staff_users?.[0]?.name || 'Unknown Staff',
        role: approval.staff_users?.[0]?.role || 'Unknown'
      }
    })) || [];

    return NextResponse.json(transformedApprovals);

  } catch (error) {
    console.error('Error in recipe approvals GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);

    if (error) {
      return NextResponse.json({ error }, { status: error === 'Missing user ID in headers' ? 401 : 500 });
    }

    if (!user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { approval_id, action, admin_notes } = await request.json();

    if (!approval_id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    // Get the approval request
    const { data: approval, error: approvalError } = await supabaseAdmin
      .from('recipe_approvals')
      .select(`
        id,
        product_id,
        proposed_recipe,
        status,
        staff_user_id,
        products!inner(
          id,
          name,
          restaurant_id
        )
      `)
      .eq('id', approval_id)
      .eq('products.restaurant_id', restaurant.id)
      .single();

    if (approvalError || !approval) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 });
    }

    if (approval.status !== 'pending') {
      return NextResponse.json({ error: 'Approval request already processed' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the approval status
    const { error: updateError } = await supabaseAdmin
      .from('recipe_approvals')
      .update({
        status: newStatus,
        admin_notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', approval_id);

    if (updateError) {
      console.error('Error updating approval:', updateError);
      return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 });
    }

    // If approved, update the actual product recipe
    if (action === 'approve') {
      const { error: productError } = await supabaseAdmin
        .from('products')
        .update({
          recipe: approval.proposed_recipe,
          has_recipe: approval.proposed_recipe && approval.proposed_recipe.length > 0,
          last_modified_by: user.id,
          last_modified_at: new Date().toISOString()
        })
        .eq('id', approval.product_id);

      if (productError) {
        console.error('Error updating product recipe:', productError);
        return NextResponse.json({ error: 'Failed to update product recipe' }, { status: 500 });
      }
    }

    // Log the activity
    await supabaseAdmin
      .from('staff_activity_log')
      .insert({
        staff_user_id: approval.staff_user_id,
        action: action === 'approve' ? 'recipe_approved' : 'recipe_rejected',
        product_id: approval.product_id,
        details: { 
          changes: `Recipe ${action}d by admin`,
          admin_notes,
          approval_id: approval.id
        }
      });

    return NextResponse.json({
      success: true,
      message: `Recipe ${action}d successfully`
    });

  } catch (error) {
    console.error('Error in recipe approvals PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
