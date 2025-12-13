'use client';

import PromoPopup from '../../../components/PromoPopup';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { menuStorage } from '@/lib/secure-storage';
import { 
  Star, 
  MapPin, 
  Clock, 
  QrCode,
  X,
  Check,
  Snowflake,
  Leaf,
  Flame,
  ShoppingCart
} from 'lucide-react';
import { layout, typography, gaps } from '@/lib/design-system';
import { OrderProvider, useOrder } from '@/contexts/OrderContext';
import RestaurantNavbar from '@/components/RestaurantNavbar';
import { formatCurrency, getNutritionLabel, type Currency, type NutritionLanguage } from '@/lib/currency-utils';
import { useTableCart } from '@/hooks/useTableCart';
import { getOrCreateClientToken } from '@/lib/crm/client-tracking';

interface MenuPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Define types for our data structures
interface Restaurant {
  id: string;
  name: string;
  slug: string;
  address: string;
  schedule: Record<string, string>;
  logo_url?: string;
  cover_url?: string;
  currency?: Currency;
  nutrition_language?: NutritionLanguage;
  // Google Business Profile integration
  google_business_location_id?: string;
  google_business_access_token?: string;
  google_business_refresh_token?: string;
  google_business_token_expires_at?: string;
  google_business_place_id?: string;
  google_business_rating?: number;
  google_business_review_count?: number;
  google_business_last_sync?: string;
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
  generated_description?: string;
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
  is_frozen?: boolean;
  is_vegetarian?: boolean;
  is_spicy?: boolean;
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
  const { showOrderSummary, setShowOrderSummary } = useOrder();
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [showAddedToast, setShowAddedToast] = useState<string | null>(null);
  const [showPlaceOrderConfirm, setShowPlaceOrderConfirm] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const menuContentRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const tableId = searchParams.get('table');
  const areaId = searchParams.get('area');

  // Prevent body scroll when order summary modal is open
  useEffect(() => {
    if (showOrderSummary || showPlaceOrderConfirm) {
      // Save current overflow style
      const originalOverflow = document.body.style.overflow;
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore original overflow when modal closes
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [showOrderSummary, showPlaceOrderConfirm]);
  
  // Reset order state when tableId changes (new QR scan)
  useEffect(() => {
    // Clear any cached order state when table changes
    setShowPlaceOrderConfirm(false);
    setPlacingOrder(false);
  }, [tableId]);
  
  // Use table cart if table_id exists, otherwise fall back to local cart
  const tableCart = useTableCart(tableId, menuData?.restaurant?.id || null);
  const isTableOrder = !!tableId;

  useEffect(() => {
    const loadMenuData = async () => {
      try {
        const { slug } = await params;
        const data = await getMenuData(slug);
        console.log('Loaded menu data:', data); // Debug log
        setMenuData(data);
        
        // Track visit after menu data is loaded
        if (data?.restaurant?.id) {
          // Import tracking function dynamically to avoid SSR issues
          const { trackVisit } = await import('@/lib/crm/client-tracking');
          trackVisit(data.restaurant.id, tableId || undefined, areaId || undefined).catch(err => {
            console.error('Failed to track visit:', err);
          });
        }
      } catch (err) {
        console.error('Error loading menu data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load menu');
      } finally {
        setIsLoading(false);
      }
    };

    loadMenuData();
  }, [params]);

  const addToOrder = async (product: Product) => {
    if (isTableOrder && tableCart) {
      try {
        await tableCart.addItem(product);
        // Show toast notification
        setShowAddedToast(product.id);
        setTimeout(() => setShowAddedToast(null), 2000);
      } catch (error: unknown) {
        // Handle table closed error
        if (error instanceof Error && error.message.includes('closed')) {
          alert('This table has been closed. Please contact staff if you need assistance.');
          // Redirect to menu without table param
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.delete('table');
            url.searchParams.delete('area');
            window.location.href = url.toString();
          }
          return;
        }
        console.error('Failed to add item:', error);
      }
    } else {
      // Fallback to local cart for non-table orders (shouldn't happen in new flow)
      console.warn('Table order expected but not available');
    }

    // Track add-to-cart for CRM
    if (menuData?.restaurant?.id) {
      import('@/lib/crm/client-tracking')
        .then(({ trackEvent }) =>
          trackEvent(menuData.restaurant.id, 'add_to_cart', {
            product_id: product.id,
            price: product.price,
          })
        )
        .catch(err => console.error('Failed to track add_to_cart', err));
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (isTableOrder && tableCart) {
      await tableCart.updateQuantity(productId, quantity);
    }
  };

  const removeFromOrder = async (productId: string) => {
    if (isTableOrder && tableCart) {
      await tableCart.removeItem(productId);
    }
  };

  const handlePlaceOrder = async () => {
    if (!isTableOrder || !tableCart) return;
    
    setShowPlaceOrderConfirm(true);
  };

  const confirmPlaceOrder = async () => {
    if (!isTableOrder || !tableCart) return;
    
    setPlacingOrder(true);
    const success = await tableCart.placeOrder();
    setPlacingOrder(false);
    
    if (success) {
      setShowPlaceOrderConfirm(false);
      setShowOrderSummary(false);
    }
  };

  // Get current order items (customer's items for table orders)
  const getCurrentOrder = () => {
    if (isTableOrder && tableCart) {
      return tableCart.customerItems;
    }
    return [];
  };

  const getTotalPrice = () => {
    if (isTableOrder && tableCart) {
      return tableCart.getCustomerTotal();
    }
    return 0;
  };

  const getTableTotal = () => {
    if (isTableOrder && tableCart) {
      return tableCart.getTableTotal();
    }
    return 0;
  };

  const toggleDescription = (productId: string, product?: Product) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });

    if (product && menuData?.restaurant?.id) {
      import('@/lib/crm/client-tracking')
        .then(({ trackEvent }) =>
          trackEvent(menuData.restaurant.id, 'product_view', {
            product_id: product.id,
            price: product.price,
          })
        )
        .catch(err => console.error('Failed to track product_view', err));
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    
    // Reset scroll position to account for sticky navigation
    setTimeout(() => {
      if (menuContentRef.current) {
        const stickyNavHeight = 80; // Approximate height of sticky navigation
        const elementTop = menuContentRef.current.offsetTop;
        const offsetPosition = elementTop - stickyNavHeight - 20; // Extra 20px for breathing room
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100); // Small delay to ensure state update is complete
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

  const currentOrder = getCurrentOrder();
  const totalItems = currentOrder.reduce((total, item) => total + item.quantity, 0);

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
                {restaurant.google_business_rating && restaurant.google_business_review_count ? (
                  <Badge 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => {
                      if (restaurant.google_business_place_id) {
                        window.open(`https://www.google.com/maps/place/?q=place_id:${restaurant.google_business_place_id}`, '_blank');
                      }
                    }}
                  >
                    <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                    {restaurant.google_business_rating} ({restaurant.google_business_review_count} reviews)
                  </Badge>
                ) : (
                  <Badge variant="secondary" title="Sample rating - Connect Google Business Profile for real-time ratings">
                    <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                    4.8 (120 reviews)
                  </Badge>
                )}
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
          <div className="flex items-center space-x-3 category-scroll pb-2 px-1">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleCategoryChange('all')}
              className="flex-shrink-0 whitespace-nowrap px-4 py-2 min-w-fit focus:ring-0 focus:outline-none"
            >
              All Items
            </Button>
            {categoriesWithProducts.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange(category.id)}
                className="flex-shrink-0 whitespace-nowrap px-4 py-2 min-w-fit focus:ring-0 focus:outline-none"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Closed Message */}
      {isTableOrder && tableCart?.tableClosed && tableCart?.tableClosedMessage && (
        <div className={`${layout.containerSmall} py-6`}>
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {tableCart?.restaurantName || restaurant?.name || 'The restaurant'} says:
                </h3>
                <p className="text-foreground mb-4 leading-relaxed">
                  {tableCart?.tableClosedMessage || 'In order to start a new order, you need to scan the QR code on the table.'}
                </p>
                <Button 
                  variant="default" 
                  onClick={() => window.location.href = `/menu/${restaurant.slug}`}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Start a New Order
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Menu Content */}
      {!(isTableOrder && tableCart?.tableClosed) && (
      <div ref={menuContentRef} className={`${layout.containerSmall} py-6`}>
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
                      onToggleDescription={() => toggleDescription(product.id, product)}
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
                      onToggleDescription={() => toggleDescription(product.id, product)}
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
      )}

      {/* Floating My Order Button - Sticky at bottom */}
      {currentOrder.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 md:bottom-6 md:right-6">
          <Button
            size="lg"
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white px-6 py-6 h-auto min-w-[140px] relative"
            onClick={() => setShowOrderSummary(true)}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            <span className="font-semibold">My Order</span>
            {totalItems > 0 && (
              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center border-2 border-white">
                {totalItems}
              </div>
            )}
            <div className="ml-2 font-bold">
              {formatCurrency(getTotalPrice(), restaurant.currency)}
            </div>
          </Button>
        </div>
      )}

      {/* Order Summary Modal */}
      {showOrderSummary && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowOrderSummary(false);
            }
          }}
          onWheel={(e) => {
            // Prevent scroll from propagating to body
            e.stopPropagation();
          }}
          onTouchMove={(e) => {
            // Prevent touch scroll from propagating to body
            e.stopPropagation();
          }}
        >
          <div 
            className="bg-white rounded-t-xl sm:rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">My Order</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowOrderSummary(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto max-h-96">
              {currentOrder.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Your order is empty</p>
              ) : (
                <div className="space-y-3">
                  {currentOrder.map((item) => (
                    <div
                      key={item.product.id}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        item.isProcessed ? 'opacity-50 bg-gray-50' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <h4 className={`font-medium ${item.isProcessed ? 'line-through' : ''}`}>
                          {item.product.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.product.price, restaurant.currency)} each
                        </p>
                      </div>
                      {!item.isProcessed && (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            disabled={tableCart?.loading}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={tableCart?.loading}
                          >
                            +
                          </Button>
                        </div>
                      )}
                      {item.isProcessed && (
                        <Badge variant="secondary" className="text-xs">Processed</Badge>
                      )}
                    </div>
                  ))}
                  {isTableOrder && tableCart && (() => {
                    const currentToken = getOrCreateClientToken();
                    const otherItems = tableCart.tableItems.filter(
                      (item) => item.customer_token && item.customer_token !== currentToken
                    );
                    return otherItems.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-semibold text-muted-foreground mb-2">Other items at table:</p>
                        {otherItems.map((item, idx) => (
                          <div key={idx} className="text-sm text-muted-foreground py-1">
                            {item.quantity}x {item.product.name}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            {currentOrder.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Your Total:</span>
                    <span className="font-bold text-lg">{formatCurrency(getTotalPrice(), restaurant.currency)}</span>
                  </div>
                  {isTableOrder && getTableTotal() > getTotalPrice() && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Table Total:</span>
                      <span className="font-semibold">{formatCurrency(getTableTotal(), restaurant.currency)}</span>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={handlePlaceOrder}
                  disabled={tableCart?.loading || placingOrder}
                >
                  {placingOrder ? 'Placing Order...' : 'Place Order'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Place Order Confirmation Modal */}
      {showPlaceOrderConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center sm:items-center">
          <div className="bg-white rounded-t-xl sm:rounded-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Ready to place order?</h3>
            <p className="text-muted-foreground mb-6">
              Has everyone at the table finished ordering?
            </p>
            {isTableOrder && tableCart && (
              <div className="mb-6 space-y-2">
                <div className="flex justify-between">
                  <span>Your order:</span>
                  <span className="font-semibold">{formatCurrency(getTotalPrice(), restaurant.currency)}</span>
                </div>
                {getTableTotal() > getTotalPrice() && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Table total:</span>
                    <span>{formatCurrency(getTableTotal(), restaurant.currency)}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPlaceOrderConfirm(false)}
                disabled={placingOrder}
              >
                Not Yet
              </Button>
              <Button
                className="flex-1"
                onClick={confirmPlaceOrder}
                disabled={placingOrder}
              >
                {placingOrder ? 'Placing...' : 'Yes, Place Order'}
              </Button>
            </div>
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
  onToggleDescription: (product: Product) => void;
  showAddedToast: boolean;
  restaurant: Restaurant;
}) {
  // Use AI generated description if available, otherwise fall back to regular description
  const description = product.generated_description || product.description || '';
  const hasDescription = description.length > 0;
  const descriptionNeedsExpanding = description.length > 60;
  const productNameNeedsExpanding = product.name.length > 30; // Threshold for product name truncation
  
  // Show full product name when no description or when expanded
  const shouldShowFullProductName = !hasDescription || isExpanded;
  
  // Description display logic
  const displayDescription = isExpanded ? description : (hasDescription ? description.slice(0, 60) : '');

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${isExpanded ? 'h-auto' : 'h-48'} flex flex-col justify-between`}>
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
            <div className="flex items-start gap-1 mb-1">
              <h3 className={`font-semibold text-foreground text-lg ${!shouldShowFullProductName ? 'line-clamp-1' : ''}`}>
                {product.name}
              </h3>
              {/* Product Attribute Icons */}
              <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                {product.is_frozen && (
                  <Snowflake className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
                {product.is_vegetarian && (
                  <Leaf className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
                {product.is_spicy && (
                  <Flame className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
              </div>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <div className="text-lg font-bold text-primary">
              {formatCurrency(product.price, restaurant.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Image + Description */}
      <div className="px-4 pb-3">
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
              {hasDescription ? (
                <div className="text-muted-foreground text-sm leading-relaxed">
                  {displayDescription}
                  {descriptionNeedsExpanding && (
                    <button
                      className="text-blue-600 hover:text-blue-700 ml-1 underline text-sm"
                      onClick={() => onToggleDescription(product)}
                    >
                      {isExpanded ? 'Less' : 'More'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm italic text-gray-500">
                  No description available
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Layout without image - full width description */
          <div className="text-muted-foreground text-sm leading-relaxed">
            {hasDescription ? (
              <>
                {displayDescription}
                {descriptionNeedsExpanding && (
                  <button
                    className="text-blue-600 hover:text-blue-700 ml-1 underline text-sm"
                    onClick={() => onToggleDescription(product)}
                  >
                    {isExpanded ? 'Less' : 'More'}
                  </button>
                )}
              </>
            ) : (
              <div className="text-muted-foreground text-sm italic text-gray-500">
                No description available
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expand/Collapse button for product name when no description */}
      {!hasDescription && productNameNeedsExpanding && (
        <div className="px-4 pb-2">
          <button
            className="text-blue-600 hover:text-blue-700 underline text-sm"
            onClick={() => onToggleDescription(product)}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </button>
        </div>
      )}

      {/* Nutrition Info and Actions - pinned to bottom */}
      <div className="px-4 pb-4 mt-auto">
        <div className="flex items-center justify-between gap-3">
          {/* Nutrition Info - Left Side */}
          {product.nutrition && (
            <div className="flex-1 p-2 bg-muted/50 rounded-md">
              <div className={`flex flex-wrap gap-1.5 text-xs text-muted-foreground ${!isExpanded ? 'line-clamp-1' : ''}`}>
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