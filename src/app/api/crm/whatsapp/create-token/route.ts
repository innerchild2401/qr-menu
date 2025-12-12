import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { env } from '@/lib/env';

/**
 * Create WhatsApp order token
 * POST /api/crm/whatsapp/create-token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      restaurantId,
      clientToken,
      orderData,
      tableId,
      areaId,
      orderType = 'dine_in',
      campaign,
    } = body;

    if (!restaurantId || !clientToken || !orderData) {
      return NextResponse.json(
        { error: 'Missing required fields: restaurantId, clientToken, orderData' },
        { status: 400 }
      );
    }

    // Find customer by token
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('client_token', clientToken)
      .single();

    // Generate short unique token
    const token = generateShortToken();

    // Create token record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expires in 1 hour

    const { data: tokenRecord, error } = await supabaseAdmin
      .from('whatsapp_order_tokens')
      .insert({
        restaurant_id: restaurantId,
        token,
        customer_id: customer?.id || null,
        table_id: tableId || null,
        area_id: areaId || null,
        order_type: orderType,
        campaign: campaign || null,
        order_data: orderData,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        phone_shared: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating WhatsApp token:', error);
      return NextResponse.json(
        { error: 'Failed to create order token' },
        { status: 500 }
      );
    }

    // Get WhatsApp number from environment (single number for all restaurants)
    const whatsappNumber = env.WHATSAPP_BUSINESS_NUMBER || '1234567890'; // TODO: Set this in env

    return NextResponse.json({
      success: true,
      token,
      whatsappNumber,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error('Error in create-token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate a short, unique token for WhatsApp orders
 */
function generateShortToken(): string {
  // Generate a 8-character alphanumeric token
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

