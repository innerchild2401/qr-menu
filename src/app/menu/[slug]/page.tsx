import PromoPopup from '../../../components/PromoPopup';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Heart, 
  Share2, 
  Star, 
  MapPin, 
  Clock, 
  ArrowLeft,
  QrCode
} from 'lucide-react';

interface MenuPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Define types for our data structures
interface Restaurant {
  name: string;
  slug: string;
  address: string;
  schedule: Record<string, string>;
  logo_url?: string;
  cover_url?: string;
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
  image_url?: string;
  nutrition?: {
    calories?: number;
    protein?: string;
    carbs?: string;
    fat?: string;
  };
  categoryId?: string;
}

interface MenuData {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
}

// Fetch menu data directly from Supabase
async function getMenuData(slug: string): Promise<MenuData> {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnhyuqhypzytnkkdifuk.supabase.co';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uaHl1cWh5cHp5dG5ra2RpZnVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTk3NjA5MiwiZXhwIjoyMDcxNTUyMDkyfQ.5gqpZ6FAMlLPFwKv-p14lssKiRt2AOMqmOY926xos8I';
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  // Clean the slug
  const cleanSlug = (slug ?? '').toString().trim();
  
  // Get restaurant
  const { data: restaurant, error: restaurantError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', cleanSlug)
    .maybeSingle();

  if (restaurantError) {
    throw new Error(`Database error: ${restaurantError.message}`);
  }

  if (!restaurant) {
    throw new Error('Restaurant not found');
  }

  // Get categories and products in parallel
  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('order'),
    supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurant.id)
  ]);

  return {
    restaurant,
    categories: categoriesResult.data || [],
    products: productsResult.data || []
  };
}

export default async function MenuPage({ params }: MenuPageProps) {
  const { slug } = await params;

  try {
    const { restaurant, categories, products } = await getMenuData(slug);

    // Group products by category
    const productsByCategory = products.reduce((acc, product) => {
      const categoryId = product.categoryId || 'uncategorized';
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      acc[categoryId].push(product);
      return acc;
    }, {} as Record<string, Product[]>);

    return (
      <div className="min-h-screen bg-background">
        {/* Promo Popup */}
        <PromoPopup slug={slug} />
        
        {/* Restaurant Header */}
        <div className="relative">
          {restaurant.cover_url && (
            <div className="h-48 md:h-64 relative overflow-hidden">
              <Image
                src={restaurant.cover_url}
                alt={restaurant.name}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          )}
          
          {/* Back button */}
          <div className="absolute top-4 left-4 z-10">
            <Button variant="secondary" size="sm" asChild className="bg-white/90 backdrop-blur-sm">
              <Link href="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>

          {/* Restaurant Info */}
          <div className="relative bg-white border-b">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <div className="flex items-start space-x-4">
                {restaurant.logo_url && (
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                    <Image
                      src={restaurant.logo_url}
                      alt={`${restaurant.name} logo`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {restaurant.name}
                  </h1>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1" />
                      {restaurant.address}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Open Now
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">
                      <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                      4.8 (120 reviews)
                    </Badge>
                    <Badge variant="outline">
                      <QrCode className="w-3 h-3 mr-1" />
                      Digital Menu
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Category Navigation */}
        <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-auto-fit">
                <TabsTrigger value="all" className="text-sm">
                  All Items
                </TabsTrigger>
                {categories.map((category) => (
                  <TabsTrigger key={category.id} value={category.id} className="text-sm">
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Menu Content */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Tabs defaultValue="all" className="w-full">
            <TabsContent value="all" className="mt-0">
              <div className="space-y-6">
                {categories.map((category) => (
                  <div key={category.id}>
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold text-foreground mb-2">
                        {category.name}
                      </h2>
                      {category.description && (
                        <p className="text-muted-foreground text-sm">
                          {category.description}
                        </p>
                      )}
                    </div>
                    <div className="space-y-4">
                      {productsByCategory[category.id]?.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                ))}
                {/* Uncategorized products */}
                {productsByCategory['uncategorized'] && (
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">
                      Other Items
                    </h2>
                    <div className="space-y-4">
                      {productsByCategory['uncategorized'].map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {categories.map((category) => (
              <TabsContent key={category.id} value={category.id} className="mt-0">
                <div className="space-y-4">
                  {productsByCategory[category.id]?.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Menu Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            The restaurant menu for &quot;{slug}&quot; could not be found.
          </p>
          <Button asChild>
            <Link href="/">
              Go Home
            </Link>
          </Button>
        </Card>
      </div>
    );
  }
}

// Product Card Component
function ProductCard({ product }: { product: Product }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex">
        {/* Product Image */}
        {product.image_url && (
          <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
            <Image
              src={product.image_url}
              alt={product.name}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        {/* Product Info */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-lg mb-1">
                {product.name}
              </h3>
              <p className="text-muted-foreground text-sm line-clamp-2">
                {product.description}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0">
              <div className="text-lg font-bold text-primary">
                ${product.price.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Nutrition Info */}
          {product.nutrition && (
            <div className="mb-3 p-2 bg-muted rounded-lg">
              <div className="flex justify-between text-xs text-muted-foreground">
                {product.nutrition.calories && (
                  <span>{product.nutrition.calories} cal</span>
                )}
                {product.nutrition.protein && (
                  <span>Protein: {product.nutrition.protein}</span>
                )}
                {product.nutrition.carbs && (
                  <span>Carbs: {product.nutrition.carbs}</span>
                )}
                {product.nutrition.fat && (
                  <span>Fat: {product.nutrition.fat}</span>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-blue-500">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
            <Button size="sm">
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
