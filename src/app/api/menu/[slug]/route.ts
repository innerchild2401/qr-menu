import { NextRequest, NextResponse } from 'next/server';
import { readJson } from '../../../../../lib/fsStore';

// Define types for our data structures
interface Restaurant {
  name: string;
  slug: string;
  address: string;
  schedule: Record<string, string>;
  logo: string;
  cover: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  order: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  nutrition: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
  categoryId: string;
}

interface MenuResponse {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<NextResponse<MenuResponse | { error: string }>> {
  try {
    const { slug } = await params;

    // Read data from JSON files
    const [restaurant, categories, products] = await Promise.all([
      readJson<Restaurant>(`data/restaurants/${slug}.json`),
      readJson<Category[]>(`data/categories/${slug}.json`),
      readJson<Product[]>(`data/products/${slug}.json`)
    ]);

    // Verify the restaurant slug matches
    if (restaurant.slug !== slug) {
      return NextResponse.json(
        { error: 'Restaurant slug mismatch' },
        { status: 404 }
      );
    }

    // Sort categories by order
    const sortedCategories = categories.sort((a, b) => a.order - b.order);

    const response: MenuResponse = {
      restaurant,
      categories: sortedCategories,
      products
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching menu data:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      return NextResponse.json(
        { error: 'Menu not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
