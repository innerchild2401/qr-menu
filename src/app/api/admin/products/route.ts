import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/auth';
import { readJson, writeJson } from '../../../../../lib/fsStore';

// Define types for product data
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

    // Read products data
    const products = await readJson<Product[]>(`data/products/${restaurantSlug}.json`);

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      // Return empty array if no products file exists yet
      return NextResponse.json({ products: [] });
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
    const { name, description, price, image, nutrition, categoryId } = await request.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'Product description is required' },
        { status: 400 }
      );
    }

    if (!price || isNaN(parseFloat(price))) {
      return NextResponse.json(
        { error: 'Valid price is required' },
        { status: 400 }
      );
    }

    if (!categoryId || !categoryId.trim()) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Read existing products or start with empty array
    let products: Product[] = [];
    try {
      products = await readJson<Product[]>(`data/products/${restaurantSlug}.json`);
    } catch (error) {
      // File doesn't exist yet, start with empty array
      products = [];
    }

    // Generate new product ID
    const productId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // Check if product with this ID already exists
    if (products.find(prod => prod.id === productId)) {
      return NextResponse.json(
        { error: 'A product with this name already exists' },
        { status: 400 }
      );
    }

    // Parse nutrition data if it's a string
    let parsedNutrition;
    if (typeof nutrition === 'string') {
      try {
        parsedNutrition = JSON.parse(nutrition);
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid nutrition data format' },
          { status: 400 }
        );
      }
    } else {
      parsedNutrition = nutrition;
    }

    // Create new product
    const newProduct: Product = {
      id: productId,
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      image: image || '',
      nutrition: parsedNutrition || {
        calories: 0,
        protein: '0g',
        carbs: '0g',
        fat: '0g'
      },
      categoryId: categoryId.trim()
    };

    // Add to products array
    products.push(newProduct);

    // Write updated products back to file
    await writeJson(`data/products/${restaurantSlug}.json`, products);

    return NextResponse.json({ 
      product: newProduct,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
