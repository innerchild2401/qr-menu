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
  sort_order?: number;
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
  category_id?: string;
  available?: boolean;
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

export default function MenuPage({ params }: MenuPageProps) {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [order, setOrder] = useState<OrderItem[]>([]);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
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

  // Filter products based on selected category
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category_id === selectedCategory);

  const totalItems = order.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Promo Popup */}
      <PromoPopup slug={restaurant.slug} />
      
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
        
        {/* Home button - refreshes current page */}
        <div className="absolute top-4 left-4 z-10">
          <Button 
            variant="secondary" 
            size="sm" 
            className="bg-white/90 backdrop-blur-sm"
            onClick={() => window.location.reload()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Home
          </Button>
        </div>

        {/* My Order button */}
        <div className="absolute top-4 right-4 z-10">
          <Button 
            variant="secondary" 
            size="sm" 
            className="bg-white/90 backdrop-blur-sm relative"
            onClick={() => setShowOrderSummary(true)}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            My Order
            {totalItems > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white">
                {totalItems}
              </Badge>
            )}
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
      </div>

      {/* Sticky Category Navigation */}
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="flex-shrink-0"
            >
              All Items
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="flex-shrink-0"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Menu Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {selectedCategory === 'all' ? (
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {productsByCategory[category.id]?.map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onAddToOrder={addToOrder}
                      isExpanded={expandedDescriptions.has(product.id)}
                      onToggleDescription={() => toggleDescription(product.id)}
                      showAddedToast={showAddedToast === product.id}
                    />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {productsByCategory['uncategorized'].map((product) => (
                    <ProductCard 
                      key={product.id} 
                      product={product} 
                      onAddToOrder={addToOrder}
                      isExpanded={expandedDescriptions.has(product.id)}
                      onToggleDescription={() => toggleDescription(product.id)}
                      showAddedToast={showAddedToast === product.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddToOrder={addToOrder}
                isExpanded={expandedDescriptions.has(product.id)}
                onToggleDescription={() => toggleDescription(product.id)}
                showAddedToast={showAddedToast === product.id}
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
                        <p className="text-sm text-muted-foreground">${item.product.price.toFixed(2)} each</p>
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
                  <span className="font-bold text-lg">${getTotalPrice().toFixed(2)}</span>
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
  showAddedToast
}: { 
  product: Product; 
  onAddToOrder: (product: Product) => void;
  isExpanded: boolean;
  onToggleDescription: () => void;
  showAddedToast: boolean;
}) {
  const description = product.description || '';
  const shouldTruncate = description.length > 100;
  const displayDescription = isExpanded ? description : description.slice(0, 100);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow h-80 flex flex-col relative">
      {/* Added to Order Toast */}
      {showAddedToast && (
        <div className="absolute top-2 right-2 z-10 bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center space-x-1 animate-in slide-in-from-top-2">
          <Check className="w-3 h-3" />
          <span>Added!</span>
        </div>
      )}
      
      {/* Product Image */}
      {product.image_url && (
        <div className="w-full h-32 relative">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
      )}
      
      {/* Product Info */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-lg mb-1 line-clamp-1">
              {product.name}
            </h3>
            <div className="text-muted-foreground text-sm mb-2">
              {displayDescription}
              {shouldTruncate && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-blue-600 hover:text-blue-700 ml-1"
                  onClick={onToggleDescription}
                >
                  {isExpanded ? 'Less' : 'More'}
                </Button>
              )}
            </div>
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
        <div className="flex items-center justify-between mt-auto">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-blue-500">
            <Share2 className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            onClick={() => onAddToOrder(product)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Add to Order
          </Button>
        </div>
      </div>
    </Card>
  );
}
