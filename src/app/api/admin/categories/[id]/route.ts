import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { readJson, writeJson } from '../../../../../../lib/fsStore';

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
    const { name, description } = await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Read existing categories
    const categories = await readJson<Category[]>(`data/categories/${restaurantSlug}.json`);

    // Find category to update
    const categoryIndex = categories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Generate new ID from name if name changed
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // If ID would change, check if new ID already exists
    if (newId !== id && categories.find(cat => cat.id === newId)) {
      return NextResponse.json(
        { error: 'A category with this name already exists' },
        { status: 400 }
      );
    }

    // Update category
    const updatedCategory: Category = {
      ...categories[categoryIndex],
      id: newId,
      name: name.trim(),
      description: description?.trim() || ''
    };

    // Replace category in array
    categories[categoryIndex] = updatedCategory;

    // Write updated categories back to file
    await writeJson(`data/categories/${restaurantSlug}.json`, categories);

    return NextResponse.json({ 
      category: updatedCategory,
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      return NextResponse.json(
        { error: 'Categories not found' },
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

    // Read existing categories
    const categories = await readJson<Category[]>(`data/categories/${restaurantSlug}.json`);

    // Find category to delete
    const categoryIndex = categories.findIndex(cat => cat.id === id);
    if (categoryIndex === -1) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // Remove category from array
    const deletedCategory = categories.splice(categoryIndex, 1)[0];

    // Reorder remaining categories to fill gaps
    categories.forEach((cat, index) => {
      cat.order = index + 1;
    });

    // Write updated categories back to file
    await writeJson(`data/categories/${restaurantSlug}.json`, categories);

    return NextResponse.json({ 
      category: deletedCategory,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      return NextResponse.json(
        { error: 'Categories not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
