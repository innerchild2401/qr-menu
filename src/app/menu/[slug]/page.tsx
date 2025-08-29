'use client';

import PromoPopup from '../../../components/PromoPopup';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { 
  Share2, 
  Star, 
  MapPin, 
  Clock, 
  ArrowLeft,
  QrCode,
  ShoppingCart,
  X,
  Check
} from 'lucide-react';
import { layout, typography, spacing, gaps } from '@/lib/design-system';
import { OrderProvider, useOrder } from '@/contexts/OrderContext';
import RestaurantNavbar from '@/components/RestaurantNavbar';
import { formatCurrency, getNutritionLabel, type Currency, type NutritionLanguage } from '@/lib/currency-utils';

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
  currency?: Currency;
  nutrition_language?: NutritionLanguage;
}

interface Category {
  id: string;
  name: string;
  sort_order?: number;
  created_at?: string;
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
    sugars?: string;
    salts?: string;
  };
  category_id?: string;
  available?: boolean;
  sort_order?: number;
  created_at?: string;
}

interface MenuData {
  restaurant: Restaurant;
  categories: Category[];
  products: Product[];
}

interface OrderItem {
  product: Product;
  quantity: number;
}

// Fetch menu data from API
async function getMenuData(slug: string): Promise<MenuData> {
  const response = await fetch(`/api/menu/${slug}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Restaurant not found');
    }
    throw new Error('Failed to load menu data');
  }

  const data = await response.json();
  return data;
}

function MenuPageContent({ params }: MenuPageProps) {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { order, setOrder, showOrderSummary, setShowOrderSummary } = useOrder();
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [showAddedToast, setShowAddedToast] = useState<string | null>(null);

  useEffect(() => {
    const loadMenuData = async () => {
      try {
        const { slug } = await params;
        const data = await getMenuData(slug);
        console.log('Loaded menu data:', data); // Debug log
        setMenuData(data);
      } catch (err) {
        console.error('Error loading menu data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load menu');
      } finally {
        setIsLoading(false);
      }
    };

    loadMenuData();
  }, [params]);

  // Load order from localStorage on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem('menuOrder');
    if (savedOrder) {
      try {
        setOrder(JSON.parse(savedOrder));
      } catch (err) {
        console.error('Failed to parse saved order:', err);
      }
    }
  }, []);

  // Save order to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('menuOrder', JSON.stringify(order));
  }, [order]);

  const addToOrder = (product: Product) => {
    setOrder(prevOrder => {
      const existingItem = prevOrder.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevOrder.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevOrder, { product, quantity: 1 }];
      }
    });
    
    // Show toast notification
    setShowAddedToast(product.id);
    setTimeout(() => setShowAddedToast(null), 2000);
  };

  const removeFromOrder = (productId: string) => {
    setOrder(prevOrder => prevOrder.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromOrder(productId);
      return;
    }
    setOrder(prevOrder =>
      prevOrder.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearOrder = () => {
    setOrder([]);
    localStorage.removeItem('menuOrder');
  };

  const getTotalPrice = () => {
    return order.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const toggleDescription = (productId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Menu Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || 'The restaurant menu could not be found.'}
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

  const { restaurant, categories, products } = menuData;

  // Group products by category
  const productsByCategory = products.reduce((acc, product) => {
    const categoryId = product.category_id || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Filter categories to only show those with products
  const categoriesWithProducts = categories.filter(category => 
    productsByCategory[category.id] && productsByCategory[category.id].length > 0
  );

  // Filter products based on selected category
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category_id === selectedCategory);

  const totalItems = order.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Restaurant Navbar - rendered inside the page where context is available */}
      <RestaurantNavbar />
      
      {/* Promo Popup */}
      <PromoPopup slug={restaurant.slug} />
      
      {/* Restaurant Header - Facebook Mobile Profile Style */}
      <div className="relative">
        {/* Cover Photo Container */}
        <div className="relative">
          {restaurant.cover_url ? (
            <div className="h-36 md:h-40 relative overflow-hidden">
              <Image
                src={restaurant.cover_url}
                alt={restaurant.name}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>
          ) : (
            <div className="h-36 md:h-40 bg-gradient-to-r from-blue-500 to-purple-600 relative">
              <div className="absolute inset-0 bg-black/10" />
            </div>
          )}
          
          {/* Circular Logo - Facebook Style Overlap */}
          <div className="absolute left-6 bottom-0 transform translate-y-1/2 z-20">
            {restaurant.logo_url ? (
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden border-4 border-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex-shrink-0">
                <Image
                  src={restaurant.logo_url}
                  alt={`${restaurant.name} logo`}
                  width={112}
                  height={112}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 border-4 border-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex-shrink-0 flex items-center justify-center">
                <span className="text-white font-bold text-2xl md:text-3xl">
                  {restaurant.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Restaurant Info - with proper spacing for overlapping logo */}
        <div className="relative bg-white border-b">
          <div className={`${layout.containerSmall} pt-20 pb-6`}>
            <div className="flex-1 min-w-0">
              <h1 className={`${typography.h3} mb-2`}>
                {restaurant.name}
              </h1>
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm text-muted-foreground mb-3">
                {restaurant.address && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                    <span className="truncate">{restaurant.address}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                  Open Now
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* TODO: Show real Google ratings when connected */}
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

      {/* Sticky Category Navigation */}
      <div className="sticky top-16 z-40 bg-white border-b shadow-sm">
        <div className={`${layout.containerSmall} py-4`}>
          <div className="flex items-center space-x-2 category-scroll pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="flex-shrink-0 whitespace-nowrap"
            >
              All Items
            </Button>
            {categoriesWithProducts.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="flex-shrink-0 whitespace-nowrap"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className={`${layout.containerSmall} py-6`}>
        {selectedCategory === 'all' ? (
          <div className="space-y-6">
            {categoriesWithProducts.map((category) => (
              <div key={category.id}>
                <div className="mb-4">
                  <h2 className={`${typography.h4} mb-2`}>
                    {category.name}
                  </h2>
                </div>
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${gaps.sm}`}>
                  {productsByCategory[category.id]?.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onAddToOrder={addToOrder}
                      isExpanded={expandedDescriptions.has(product.id)}
                      onToggleDescription={() => toggleDescription(product.id)}
                      showAddedToast={showAddedToast === product.id}
                      restaurant={restaurant}
                    />
                  ))}
                </div>
              </div>
            ))}
            {/* Uncategorized products */}
            {productsByCategory['uncategorized'] && (
              <div>
                <h2 className={`${typography.h4} mb-4`}>
                  Other Items
                </h2>
                <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${gaps.sm}`}>
                  {productsByCategory['uncategorized'].map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onAddToOrder={addToOrder}
                      isExpanded={expandedDescriptions.has(product.id)}
                      onToggleDescription={() => toggleDescription(product.id)}
                      showAddedToast={showAddedToast === product.id}
                      restaurant={restaurant}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${gaps.sm}`}>
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToOrder={addToOrder}
                isExpanded={expandedDescriptions.has(product.id)}
                onToggleDescription={() => toggleDescription(product.id)}
                showAddedToast={showAddedToast === product.id}
                restaurant={restaurant}
              />
            ))}
          </div>
        )}
      </div>

      {/* Order Summary Modal */}
      {showOrderSummary && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center">
          <div className="bg-white rounded-t-xl sm:rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">My Order</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowOrderSummary(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              {order.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Your order is empty</p>
              ) : (
                <div className="space-y-3">
                  {order.map((item) => (
                    <div key={item.product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product.name}</h4>
                        <p className="text-sm text-muted-foreground">{formatCurrency(item.product.price, restaurant.currency)} each</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {order.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold">Total:</span>
                  <span className="font-bold text-lg">{formatCurrency(getTotalPrice(), restaurant.currency)}</span>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" className="flex-1" onClick={clearOrder}>
                    Clear Order
                  </Button>
                  <Button className="flex-1">
                    Place Order
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({ 
  product, 
  onAddToOrder, 
  isExpanded, 
  onToggleDescription,
  showAddedToast,
  restaurant
}: { 
  product: Product; 
  onAddToOrder: (product: Product) => void;
  isExpanded: boolean;
  onToggleDescription: () => void;
  showAddedToast: boolean;
  restaurant: Restaurant;
}) {
  const description = product.description || '';
  const shouldTruncate = description.length > 60;
  const displayDescription = isExpanded ? description : description.slice(0, 60);

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${isExpanded ? 'h-auto' : 'h-48'} flex flex-col`}>
      {/* Added to Order Toast */}
      {showAddedToast && (
        <div className="absolute top-2 right-2 z-10 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-1 animate-in slide-in-from-top-2">
          <Check className="w-3 h-3" />
          <span>Added!</span>
        </div>
      )}
      
      {/* Header with name and price - at the top */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg mb-1 line-clamp-1">
              {product.name}
            </h3>
          </div>
          <div className="ml-4 flex-shrink-0">
            <div className="text-lg font-bold text-primary">
              {formatCurrency(product.price, restaurant.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Image + Description */}
      <div className="px-4 pb-2">
        {product.image_url ? (
          /* Layout with image */
          <div className="flex gap-3">
            {/* Image Square - Left Column */}
            <div className="flex-shrink-0">
              <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-muted">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
                {/* Gradient overlay for smooth transition to text */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white dark:to-background opacity-80" />
              </div>
            </div>
            
            {/* Description - Right Column */}
            <div className="flex-1 min-w-0">
              <div className="text-muted-foreground text-sm">
                {displayDescription}
                {shouldTruncate && (
                  <button
                    className="text-blue-600 hover:text-blue-700 ml-1 underline text-sm"
                    onClick={onToggleDescription}
                  >
                    {isExpanded ? 'Less' : 'More'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Layout without image - full width description */
          <div className="text-muted-foreground text-sm">
            {displayDescription}
            {shouldTruncate && (
              <button
                className="text-blue-600 hover:text-blue-700 ml-1 underline text-sm"
                onClick={onToggleDescription}
              >
                {isExpanded ? 'Less' : 'More'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Nutrition Info and Actions - pinned to bottom */}
      <div className="px-4 pb-4 mt-auto">
        <div className="flex items-center justify-between gap-3">
          {/* Nutrition Info - Left Side */}
          {product.nutrition && (
            <div className="flex-1 p-2 bg-muted/50 rounded-md">
              <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                {product.nutrition.calories && (
                  <span className="font-medium">{product.nutrition.calories} {getNutritionLabel('calories', restaurant.nutrition_language)}</span>
                )}
                {product.nutrition.protein && (
                  <span>{getNutritionLabel('protein', restaurant.nutrition_language)}: {product.nutrition.protein}g</span>
                )}
                {product.nutrition.carbs && (
                  <span>{getNutritionLabel('carbs', restaurant.nutrition_language)}: {product.nutrition.carbs}g</span>
                )}
                {product.nutrition.fat && (
                  <span>{getNutritionLabel('fat', restaurant.nutrition_language)}: {product.nutrition.fat}g</span>
                )}
                {product.nutrition.sugars && (
                  <span>{getNutritionLabel('sugars', restaurant.nutrition_language)}: {product.nutrition.sugars}g</span>
                )}
                {product.nutrition.salts && (
                  <span>{getNutritionLabel('salts', restaurant.nutrition_language)}: {product.nutrition.salts}g</span>
                )}
              </div>
            </div>
          )}

          {/* Add to Order Button - Right Side */}
          <div className="flex-shrink-0">
            <Button 
              size="sm" 
              onClick={() => onAddToOrder(product)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Add to Order
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Wrapper component that provides the OrderProvider
export default function MenuPage({ params }: MenuPageProps) {
  return (
    <OrderProvider>
      <MenuPageContent params={params} />
    </OrderProvider>
  );
}
