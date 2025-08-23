import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { readJson, writeJson } from '../../../../../lib/fsStore';

// Define types for category data
interface Category {
  id: string;
  name: string;
  description: string;
  order: number;
}

interface ExtendedSession {
  user?: {
    email?: string | null;
  };
  restaurantSlug?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantSlug = session.restaurantSlug;

    // Read categories data
    const categories = await readJson<Category[]>(`data/categories/${restaurantSlug}.json`);

    // Sort categories by order
    const sortedCategories = categories.sort((a, b) => a.order - b.order);

    return NextResponse.json({ categories: sortedCategories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      // Return empty array if no categories file exists yet
      return NextResponse.json({ categories: [] });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Get session to verify authentication and get restaurant slug
    const session = await getServerSession(authOptions) as ExtendedSession;
    
    if (!session || !session.restaurantSlug) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const restaurantSlug = session.restaurantSlug;

    // Parse request body
    const { name, description } = await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Read existing categories or start with empty array
    let categories: Category[] = [];
    try {
      categories = await readJson<Category[]>(`data/categories/${restaurantSlug}.json`);
    } catch (error) {
      // File doesn't exist yet, start with empty array
      categories = [];
    }

    // Generate new category ID
    const categoryId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // Check if category with this ID already exists
    if (categories.find(cat => cat.id === categoryId)) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      );
    }

    // Determine order (highest order + 1)
    const maxOrder = categories.length > 0 ? Math.max(...categories.map(cat => cat.order)) : 0;

    // Create new category
    const newCategory: Category = {
      id: categoryId,
      name: name.trim(),
      description: description?.trim() || '',
      order: maxOrder + 1
    };

    // Add to categories array
    categories.push(newCategory);

    // Write updated categories back to file
    await writeJson(`data/categories/${restaurantSlug}.json`, categories);

    return NextResponse.json({ 
      category: newCategory,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
