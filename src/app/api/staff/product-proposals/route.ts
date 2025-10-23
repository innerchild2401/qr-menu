import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    // Get staff user from request headers
    const staffUserId = request.headers.get('x-staff-user-id');
    if (!staffUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get staff user info to verify they exist
    const { data: staffUser, error: staffError } = await supabaseAdmin
      .from('staff_users')
      .select('id, name, restaurant_id')
      .eq('id', staffUserId)
      .single();

    if (staffError || !staffUser) {
      return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
    }

    // Get product proposals submitted by this staff user
    const { data: proposals, error: proposalsError } = await supabaseAdmin
      .from('product_proposals')
      .select(`
        id,
        name,
        description,
        price,
        image_url,
        has_recipe,
        recipe,
        is_frozen,
        is_vegetarian,
        is_spicy,
        status,
        admin_notes,
        reviewed_at,
        created_at,
        category_id,
        categories(
          id,
          name
        )
      `)
      .eq('staff_user_id', staffUserId)
      .order('created_at', { ascending: false });

    if (proposalsError) {
      console.error('Error fetching product proposals:', proposalsError);
      // If table doesn't exist, return empty array instead of error
      if (proposalsError.code === '42P01') { // Table doesn't exist
        console.log('Product proposals table does not exist, returning empty array');
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: 'Failed to fetch product proposals' }, { status: 500 });
    }

    // Transform the data to make it more usable
    const transformedProposals = proposals?.map(proposal => {
      const category = Array.isArray(proposal.categories) ? proposal.categories[0] : proposal.categories;
      
      return {
        id: proposal.id,
        name: proposal.name,
        description: proposal.description,
        price: proposal.price,
        image_url: proposal.image_url,
        has_recipe: proposal.has_recipe,
        recipe: proposal.recipe,
        is_frozen: proposal.is_frozen,
        is_vegetarian: proposal.is_vegetarian,
        is_spicy: proposal.is_spicy,
        status: proposal.status,
        admin_notes: proposal.admin_notes,
        reviewed_at: proposal.reviewed_at,
        created_at: proposal.created_at,
        category_id: proposal.category_id,
        category_name: category?.name || 'No Category'
      };
    }) || [];

    return NextResponse.json(transformedProposals);

  } catch (error) {
    console.error('Error in staff product proposals GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get staff user from request headers
    const staffUserId = request.headers.get('x-staff-user-id');
    if (!staffUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get staff user info to verify they exist and get restaurant_id
    const { data: staffUser, error: staffError } = await supabaseAdmin
      .from('staff_users')
      .select('id, name, restaurant_id')
      .eq('id', staffUserId)
      .single();

    if (staffError || !staffUser) {
      return NextResponse.json({ error: 'Staff user not found' }, { status: 404 });
    }

    const {
      name,
      description,
      price,
      image_url,
      category_id,
      has_recipe,
      recipe,
      is_frozen,
      is_vegetarian,
      is_spicy
    } = await request.json();

    // Validate required fields
    if (!name || !price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    // Create product proposal
    const { data: proposal, error: proposalError } = await supabaseAdmin
      .from('product_proposals')
      .insert({
        staff_user_id: staffUserId,
        restaurant_id: staffUser.restaurant_id,
        category_id: category_id || null,
        name: name.trim(),
        description: description?.trim() || null,
        price: parseFloat(price),
        image_url: image_url || null,
        has_recipe: has_recipe || false,
        recipe: recipe || null,
        is_frozen: is_frozen || false,
        is_vegetarian: is_vegetarian || false,
        is_spicy: is_spicy || false,
        status: 'pending'
      })
      .select()
      .single();

    if (proposalError) {
      console.error('Error creating product proposal:', proposalError);
      // If table doesn't exist, return a helpful error
      if (proposalError.code === '42P01') { // Table doesn't exist
        return NextResponse.json({ error: 'Product proposals feature not available yet. Please contact your administrator.' }, { status: 503 });
      }
      return NextResponse.json({ error: 'Failed to create product proposal' }, { status: 500 });
    }

    // Log the activity
    await supabaseAdmin
      .from('staff_activity_log')
      .insert({
        staff_user_id: staffUserId,
        action: 'product_proposal_created',
        details: { 
          product_name: name,
          proposal_id: proposal.id
        }
      });

    return NextResponse.json({
      success: true,
      proposal,
      message: 'Product proposal submitted successfully'
    });

  } catch (error) {
    console.error('Error in staff product proposals POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
