import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { readJson, writeJson } from '../../../../../../lib/fsStore';

// Define types for popup data
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

interface ExtendedSession {
  user?: {
    email?: string | null;
  };
  restaurantSlug?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const restaurantSlug = session.restaurantSlug;

    // Parse request body
    const { 
      title, 
      message, 
      image, 
      ctaText, 
      ctaUrl, 
      active, 
      startAt, 
      endAt, 
      frequency 
    } = await request.json();

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Popup title is required' },
        { status: 400 }
      );
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Popup message is required' },
        { status: 400 }
      );
    }

    if (!frequency || !['once-per-session', 'every-visit'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Valid frequency is required (once-per-session or every-visit)' },
        { status: 400 }
      );
    }

    // Validate dates if provided
    if (startAt && endAt) {
      const startDate = new Date(startAt);
      const endDate = new Date(endAt);
      if (endDate <= startDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Read existing popups
    const popups = await readJson<Popup[]>(`data/popups/${restaurantSlug}.json`);

    // Find popup to update
    const popupIndex = popups.findIndex(popup => popup.id === id);
    if (popupIndex === -1) {
      return NextResponse.json(
        { error: 'Popup not found' },
        { status: 404 }
      );
    }

    // Generate new ID from title if title changed
    const newId = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // If ID would change, check if new ID already exists
    if (newId !== id && popups.find(popup => popup.id === newId)) {
      return NextResponse.json(
        { error: 'A popup with this title already exists' },
        { status: 400 }
      );
    }

    // Update popup
    const updatedPopup: Popup = {
      ...popups[popupIndex],
      id: newId,
      title: title.trim(),
      message: message.trim(),
      image: image?.trim() || undefined,
      ctaText: ctaText?.trim() || undefined,
      ctaUrl: ctaUrl?.trim() || undefined,
      active: Boolean(active),
      startAt: startAt || undefined,
      endAt: endAt || undefined,
      frequency
    };

    // Replace popup in array
    popups[popupIndex] = updatedPopup;

    // Write updated popups back to file
    await writeJson(`data/popups/${restaurantSlug}.json`, popups);

    return NextResponse.json({ 
      popup: updatedPopup,
      message: 'Popup updated successfully'
    });
  } catch (error) {
    console.error('Error updating popup:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      return NextResponse.json(
        { error: 'Popups not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const restaurantSlug = session.restaurantSlug;

    // Read existing popups
    const popups = await readJson<Popup[]>(`data/popups/${restaurantSlug}.json`);

    // Find popup to delete
    const popupIndex = popups.findIndex(popup => popup.id === id);
    if (popupIndex === -1) {
      return NextResponse.json(
        { error: 'Popup not found' },
        { status: 404 }
      );
    }

    // Remove popup from array
    const deletedPopup = popups.splice(popupIndex, 1)[0];

    // Write updated popups back to file
    await writeJson(`data/popups/${restaurantSlug}.json`, popups);

    return NextResponse.json({ 
      popup: deletedPopup,
      message: 'Popup deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting popup:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      return NextResponse.json(
        { error: 'Popups not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
