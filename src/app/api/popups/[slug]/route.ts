import { NextRequest, NextResponse } from 'next/server';
import { getActivePopups } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Use the server-side function that already exists
    const popups = await getActivePopups(slug);
    
    // Return the first active popup if any exist
    const activePopup = popups.length > 0 ? popups[0] : null;
    
    return NextResponse.json({ popup: activePopup });
  } catch (error) {
    console.error('Error fetching popups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popups' },
      { status: 500 }
    );
  }
}