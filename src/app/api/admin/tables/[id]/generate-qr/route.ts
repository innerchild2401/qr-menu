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

    // Generate QR code (use restaurant slug from the validated restaurant)
    const baseUrl = env.APP_URL || 'http://localhost:3000';
    const { publicUrl, storagePath, menuUrl } = await generateTableQRCode(
      restaurant.slug,
      tableId,
      table.table_number,
      area?.id,
      baseUrl
    );

    // Update table with QR code info
    const { error: updateError } = await supabaseAdmin
      .from('tables')
      .update({
        qr_code_url: publicUrl,
        qr_code_path: storagePath,
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

