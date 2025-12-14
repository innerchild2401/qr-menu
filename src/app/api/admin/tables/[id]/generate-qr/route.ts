import { NextRequest, NextResponse } from 'next/server';
import { validateUserAndGetRestaurant } from '../../../../../../../lib/api-route-helpers';
import { supabaseAdmin } from '../../../../../../../lib/supabase-server';
import { generateTableQRCode } from '../../../../../../../lib/qrCodeUtils';
import { env } from '@/lib/env';

/**
 * Generate QR code for a specific table
 * POST /api/admin/tables/[id]/generate-qr
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tableId } = await params;

    const { user, restaurant, error } = await validateUserAndGetRestaurant(request);
    
    if (error) {
      if (error === 'Missing user ID in headers') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error === 'No restaurant found for user') {
        return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch restaurant data' }, { status: 500 });
    }

    if (!user || !restaurant) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get table details (we already have restaurant, but need area info)
    const { data: table, error: tableError } = await supabaseAdmin
      .from('tables')
      .select(`
        *,
        area:areas (
          id,
          name
        )
      `)
      .eq('id', tableId)
      .eq('restaurant_id', restaurant.id)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    const area = table.area as { id: string; name: string } | null;

    // Get base URL from environment variable first, then from request headers
    // This ensures production URLs work correctly
    let baseUrl = env.APP_URL;
    if (!baseUrl || baseUrl === 'http://localhost:3000') {
      // Fall back to request-based URL detection for dynamic environments
      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || 
                      (request.headers.get('x-forwarded-ssl') === 'on' ? 'https' : 'http');
      baseUrl = `${protocol}://${host}`;
    }

    // Generate QR code (use restaurant slug from the validated restaurant)
    const { publicUrl, storagePath, menuUrl } = await generateTableQRCode(
      restaurant.slug,
      tableId,
      table.table_number,
      area?.id,
      baseUrl
    );

    // Ensure table has session_id (generate if missing)
    // Session_id should be set at table creation, but ensure it exists for QR generation
    let sessionId = table.session_id;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      console.log('⚠️ [GENERATE QR] Table missing session_id, generating one:', sessionId);
    }

    // Update table with QR code info and ensure session_id exists
    const { error: updateError } = await supabaseAdmin
      .from('tables')
      .update({
        qr_code_url: publicUrl,
        qr_code_path: storagePath,
        session_id: sessionId, // Ensure session_id is set when QR is generated
        updated_at: new Date().toISOString(),
      })
      .eq('id', tableId);

    if (updateError) {
      console.error('Error updating table QR code:', updateError);
      // Don't fail the request, QR was generated successfully
    }

    return NextResponse.json({
      success: true,
      qrCodeUrl: publicUrl,
      menuUrl,
      storagePath,
    });
  } catch (error) {
    console.error('Error generating table QR code:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR code', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

