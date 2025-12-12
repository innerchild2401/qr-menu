import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

/**
 * WhatsApp Webhook Stub
 * - Parses incoming WA message payload
 * - Extracts order token
 * - Attaches phone to token record (without auto-sharing with restaurant)
 * - Marks token as received
 *
 * Note: Real signature validation and provider-specific payload parsing
 * should be added when integrating with Twilio/Meta/360dialog.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Minimal parsing: expect { token: string, phone: string }
    const token = payload.token || payload?.messages?.[0]?.text?.body?.split('Order: ')?.[1];
    const phone = payload.phone || payload?.messages?.[0]?.from;

    if (!token || !phone) {
      return NextResponse.json({ error: 'Missing token or phone' }, { status: 400 });
    }

    const { data: record } = await supabaseAdmin
      .from('whatsapp_order_tokens')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!record) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('whatsapp_order_tokens')
      .update({
        phone_number: phone,
        status: 'received',
        processed_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    if (updateError) {
      console.error('Failed to update WA token:', updateError);
      return NextResponse.json({ error: 'Failed to update token' }, { status: 500 });
    }

    // TODO: Route to dining room view notification channel (e.g., websocket)

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

