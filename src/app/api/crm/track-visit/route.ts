import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * Track a customer visit
 * POST /api/crm/track-visit
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      restaurantId,
      clientToken,
      clientFingerprint,
      tableId,
      areaId,
      campaign,
      qrCodeType = 'general',
      deviceInfo,
      referrer,
    } = body;

    console.log('📊 Track visit called:', {
      restaurantId,
      hasClientToken: !!clientToken,
      hasFingerprint: !!clientFingerprint,
      tableId,
      areaId,
      qrCodeType,
    });

    if (!restaurantId || !clientToken) {
      console.error('❌ Missing required fields:', { restaurantId, clientToken });
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, clientToken' },
        { status: 400 }
      );
    }

    // Find or create customer
    const customer = await findOrCreateCustomer(
      restaurantId,
      clientToken,
      clientFingerprint
    );

    console.log('✅ Customer found/created:', customer.id);

    // Create visit record
    const visitData = {
      customer_id: customer.id,
      restaurant_id: restaurantId,
      table_id: tableId || null,
      area_id: areaId || null,
      visit_timestamp: new Date().toISOString(),
      device_info: deviceInfo || null,
      referrer: referrer || null,
      qr_code_type: qrCodeType,
      qr_code_campaign: campaign || null,
      menu_views: 0,
      order_placed: false,
    };

    console.log('📝 Creating visit record:', visitData);

    const { data: visit, error: visitError } = await supabaseAdmin
      .from('customer_visits')
      .insert(visitData)
      .select()
      .single();

    if (visitError) {
      console.error('❌ Error creating visit:', visitError);
      return NextResponse.json(
        { error: 'Failed to track visit' },
        { status: 500 }
      );
    }

    console.log('✅ Visit created:', visit.id);

    // Update customer last_seen_at and increment total_visits
    const { error: updateError } = await supabaseAdmin
      .from('customers')
      .update({
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_visits: (customer.total_visits || 0) + 1,
      })
      .eq('id', customer.id);

    if (updateError) {
      console.error('⚠️ Error updating customer:', updateError);
    } else {
      console.log('✅ Customer updated successfully');
    }

    return NextResponse.json({
      success: true,
      visitId: visit.id,
      customerId: customer.id,
    });
  } catch (error) {
    console.error('Error in track-visit:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Find existing customer or create new one
 */
async function findOrCreateCustomer(
  restaurantId: string,
  clientToken: string,
  clientFingerprint?: string
) {
  console.log('🔍 Finding customer:', {
    restaurantId,
    clientToken: clientToken.substring(0, 20) + '...',
    hasFingerprint: !!clientFingerprint,
    fingerprint: clientFingerprint ? clientFingerprint.substring(0, 20) + '...' : null,
  });

  // Try to find by client_token first (primary identifier)
  const { data: customerByToken, error: tokenError } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('client_token', clientToken)
    .single();

  if (tokenError && tokenError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('❌ Error finding customer by token:', tokenError);
  }

  let customer = customerByToken || null;

  if (customer) {
    console.log('✅ Found customer by client_token:', customer.id);
    return customer;
  }

  // If not found and we have fingerprint, try that (fallback for when localStorage is cleared)
  if (clientFingerprint) {
    const { data: fingerprintCustomer, error: fingerprintError } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('client_fingerprint_id', clientFingerprint)
      .single();

    if (fingerprintError && fingerprintError.code !== 'PGRST116') {
      console.error('❌ Error finding customer by fingerprint:', fingerprintError);
    }

    if (fingerprintCustomer) {
      console.log('✅ Found customer by fingerprint, updating token:', fingerprintCustomer.id);
      // Update with new client_token (user cleared localStorage but same device)
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('customers')
        .update({ client_token: clientToken })
        .eq('id', fingerprintCustomer.id)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating customer token:', updateError);
        return fingerprintCustomer; // Return original if update fails
      }

      return updated;
    }
  }

  // Create new customer if not found
  if (!customer) {
    console.log('🆕 Creating new customer with token:', clientToken.substring(0, 20) + '...');
    const { data: newCustomer, error } = await supabaseAdmin
      .from('customers')
      .insert({
        restaurant_id: restaurantId,
        client_token: clientToken,
        client_fingerprint_id: clientFingerprint || null,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        total_visits: 0,
        total_spent: 0,
        average_order_value: 0,
        lifetime_value: 0,
        loyalty_tier: 'Bronze',
        loyalty_points: 0,
        status: 'active',
        phone_shared_with_restaurant: false,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating customer:', error);
      throw new Error('Failed to create customer');
    }

    console.log('✅ Created new customer:', newCustomer.id);
    customer = newCustomer;
  }

  return customer;
}

