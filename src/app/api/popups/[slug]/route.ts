import { NextRequest, NextResponse } from 'next/server';
import { readJson } from '../../../../../lib/fsStore';

// Define types for popup data structure
interface Popup {
  id: string;
  title: string;
  message: string;
  image?: string;
  ctaText?: string;
  ctaUrl?: string;
  active: boolean;
  startAt?: string;
  endAt?: string;
  frequency: "once-per-session" | "every-visit";
}

interface PopupsResponse {
  popups: Popup[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<PopupsResponse | { error: string }>> {
  try {
    const { slug } = await params;
    const now = new Date();

    // Read popups data from JSON file
    const allPopups = await readJson<Popup[]>(`data/popups/${slug}.json`);

    // Filter active popups that are within their date range
    const activePopups = allPopups.filter(popup => {
      // Must be marked as active
      if (!popup.active) return false;

      // Check start date if provided
      if (popup.startAt) {
        const startDate = new Date(popup.startAt);
        if (now < startDate) return false;
      }

      // Check end date if provided
      if (popup.endAt) {
        const endDate = new Date(popup.endAt);
        if (now > endDate) return false;
      }

      return true;
    });

    // Sort by most recent start date (latest first)
    const sortedPopups = activePopups.sort((a, b) => {
      const dateA = a.startAt ? new Date(a.startAt).getTime() : 0;
      const dateB = b.startAt ? new Date(b.startAt).getTime() : 0;
      return dateB - dateA;
    });

    const response: PopupsResponse = {
      popups: sortedPopups
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching popups data:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      return NextResponse.json(
        { popups: [] }, // Return empty array instead of error for missing popup files
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
