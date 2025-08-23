import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../lib/auth';
import { readJson, writeJson } from '../../../../../../lib/fsStore';

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

    // Read existing products
    const products = await readJson<Product[]>(`data/products/${restaurantSlug}.json`);

    // Find product to update
    const productIndex = products.findIndex(prod => prod.id === id);
    if (productIndex === -1) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Generate new ID from name if name changed
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    
    // If ID would change, check if new ID already exists
    if (newId !== id && products.find(prod => prod.id === newId)) {
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

    // Update product
    const updatedProduct: Product = {
      ...products[productIndex],
      id: newId,
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      image: image || products[productIndex].image,
      nutrition: parsedNutrition || products[productIndex].nutrition,
      categoryId: categoryId.trim()
    };

    // Replace product in array
    products[productIndex] = updatedProduct;

    // Write updated products back to file
    await writeJson(`data/products/${restaurantSlug}.json`, products);

    return NextResponse.json({ 
      product: updatedProduct,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      return NextResponse.json(
        { error: 'Products not found' },
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

    // Read existing products
    const products = await readJson<Product[]>(`data/products/${restaurantSlug}.json`);

    // Find product to delete
    const productIndex = products.findIndex(prod => prod.id === id);
    if (productIndex === -1) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Remove product from array
    const deletedProduct = products.splice(productIndex, 1)[0];

    // Write updated products back to file
    await writeJson(`data/products/${restaurantSlug}.json`, products);

    return NextResponse.json({ 
      product: deletedProduct,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    
    if (error instanceof Error && error.message.includes('File not found')) {
      return NextResponse.json(
        { error: 'Products not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
