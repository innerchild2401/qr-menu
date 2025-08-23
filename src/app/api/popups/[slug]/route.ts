import { NextRequest, NextResponse } from 'next/server';
import { getActivePopups } from '../../../../../lib/supabase-server';
import { initializeServer } from '../../../../../lib/serverInit';
import type { Popup } from '../../../../../lib/supabase-server';

interface PopupsResponse {
  popups: Popup[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<PopupsResponse | { error: string }>> {
  try {
    // Initialize server resources
    await initializeServer();
    
    const { slug } = await params;

    // Get active popups from Supabase
    const popups = await getActivePopups(slug);

    // Sort by most recent creation date (latest first)
    const sortedPopups = popups.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    const response: PopupsResponse = {
      popups: sortedPopups
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching popups data:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}