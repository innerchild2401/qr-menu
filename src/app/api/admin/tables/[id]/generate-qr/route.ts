import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
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

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get table details
    const { data: userRestaurant } = await supabase
      .from('user_restaurants')
      .select('restaurant_id')
      .eq('user_id', user.id)
      .single();

    if (!userRestaurant) {
      return NextResponse.json({ error: 'No restaurant found' }, { status: 404 });
    }

    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select(`
        *,
        area:areas (
          id,
          name
        ),
        restaurant:restaurants (
          id,
          slug
        )
      `)
      .eq('id', tableId)
      .eq('restaurant_id', userRestaurant.restaurant_id)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    const restaurant = table.restaurant as { id: string; slug: string };
    const area = table.area as { id: string; name: string } | null;

    // Generate QR code
    const baseUrl = env.APP_URL || 'http://localhost:3000';
    const { publicUrl, storagePath, menuUrl } = await generateTableQRCode(
      restaurant.slug,
      tableId,
      table.table_number,
      area?.id,
      baseUrl
    );

    // Update table with QR code info
    const { error: updateError } = await supabase
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

