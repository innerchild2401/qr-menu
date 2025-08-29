'use client';

import { authenticatedApiCall, authenticatedApiCallWithBody } from '@/lib/api-helpers';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  ChevronUp, 
  ChevronDown, 
  Eye, 
  GripVertical,
  Settings,
  Package,
  List,
  Move
} from 'lucide-react';
import { typography, spacing, gaps } from '@/lib/design-system';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Category {
  id: string;
  name: string;
  restaurant_id: string;
  created_at: string;
  sort_order?: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  nutrition?: Record<string, unknown>;
  category_id?: string;
  restaurant_id: string;
  created_at: string;
  available?: boolean;
  sort_order?: number;
  categories?: {
    name: string;
  };
}

// Sortable Category Component
function SortableCategory({ 
  category, 
  index, 
  isReordering, 
  categoryProducts, 
  onReorder, 
  onViewItems 
}: {
  category: Category;
  index: number;
  isReordering: boolean;
  categoryProducts: Product[];
  onReorder: (categoryId: string, direction: 'up' | 'down') => void;
  onViewItems: (categoryId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 border border-border rounded-lg transition-all duration-200 ${
        isDragging 
          ? 'shadow-2xl scale-105 bg-background/80 backdrop-blur-sm' 
          : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center space-x-3">
        {isReordering && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <div>
          <h3 className="font-medium text-foreground">{category.name}</h3>
          <p className="text-sm text-muted-foreground">
            {categoryProducts.length} items
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {isReordering && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReorder(category.id, 'up')}
              disabled={index === 0}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReorder(category.id, 'down')}
              disabled={index === -1}
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </>
        )}
        <button 
          onClick={() => onViewItems(category.id)}
          className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
        >
          View Items →
        </button>
      </div>
    </div>
  );
}

// Sortable Product Component
function SortableProduct({ 
  product, 
  index, 
  isReordering, 
  onReorder, 
  onToggleVisibility, 
  isUpdatingVisibility 
}: {
  product: Product;
  index: number;
  isReordering: boolean;
  onReorder: (productId: string, direction: 'up' | 'down') => void;
  onToggleVisibility: (productId: string, currentAvailable: boolean) => void;
  isUpdatingVisibility: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <tr 
      ref={setNodeRef}
      style={style}
      className={`border-b border-border transition-all duration-200 ${
        isDragging 
          ? 'shadow-2xl scale-105 bg-background/80 backdrop-blur-sm' 
          : 'hover:bg-muted/50'
      }`}
    >
      {isReordering && (
        <td className="py-3 px-4">
          <div className="flex items-center space-x-2">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            >
              <Move className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReorder(product.id, 'up')}
                disabled={index === 0}
                className="h-6 w-6 p-0"
              >
                <ChevronUp className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReorder(product.id, 'down')}
                disabled={index === -1}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </td>
      )}
      <td className="py-3 px-4 text-foreground font-medium">
        {product.name}
      </td>
      <td className="py-3 px-4 text-foreground font-medium">
        ${product.price.toFixed(2)}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center space-x-2">
          <Switch
            checked={product.available !== false}
            onCheckedChange={() => onToggleVisibility(product.id, product.available !== false)}
            disabled={isUpdatingVisibility === product.id}
          />
          <span className="text-sm text-muted-foreground">
            {product.available !== false ? 'Visible' : 'Hidden'}
          </span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex space-x-2">
          <button 
            onClick={() => window.location.href = `/admin/products?edit=${product.id}`}
            className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
          >
            Edit
          </button>
          <button 
            onClick={() => window.location.href = `/admin/products`}
            className="text-destructive hover:text-destructive/80 text-sm font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminMenu() {
  
  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isReordering, setIsReordering] = useState(false);
  const [isReorderingProducts, setIsReorderingProducts] = useState(false);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState<string | null>(null);

  // Feature flag for advanced menu management
  const enableMenuAdmin = process.env.NEXT_PUBLIC_ENABLE_MENU_ADMIN === 'true';

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // First, check if user has a restaurant
      const restaurantResponse = await authenticatedApiCall('/api/admin/me/restaurant');
      if (restaurantResponse.ok) {
        setHasRestaurant(true);
      } else if (restaurantResponse.status === 404) {
        // No restaurant found
        setHasRestaurant(false);
        setCategories([]);
        setProducts([]);
        return;
      } else {
        console.error('Failed to load restaurant data');
        setHasRestaurant(false);
        return;
      }

      // Load categories
      const categoriesResponse = await authenticatedApiCall('/api/admin/categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);
      } else {
        console.error('Failed to load categories');
      }

      // Load products
      const productsResponse = await authenticatedApiCall('/api/admin/products');
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData.products || []);
      } else {
        console.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setHasRestaurant(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reorder categories
  const reorderCategory = async (categoryId: string, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex(cat => cat.id === categoryId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const newCategories = [...categories];
    const [movedCategory] = newCategories.splice(currentIndex, 1);
    newCategories.splice(newIndex, 0, movedCategory);

    // Update sort_order for all categories
    const updatedCategories = newCategories.map((cat, index) => ({
      ...cat,
      sort_order: index
    }));

    setCategories(updatedCategories);

    try {
      // Update the sort order in the database
      const response = await authenticatedApiCallWithBody('/api/admin/categories/reorder', {
        categories: updatedCategories.map(cat => ({
          id: cat.id,
          sort_order: cat.sort_order
        }))
      }, {
        method: 'PUT'
      });

      if (!response.ok) {
        console.error('Failed to reorder categories');
        // Revert on error
        loadData();
      }
    } catch (error) {
      console.error('Error reordering categories:', error);
      // Revert on error
      loadData();
    }
  };

  // Reorder products within a category
  const reorderProduct = async (productId: string, direction: 'up' | 'down') => {
    const currentIndex = filteredProducts.findIndex(prod => prod.id === productId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= filteredProducts.length) return;

    const newProducts = [...filteredProducts];
    const [movedProduct] = newProducts.splice(currentIndex, 1);
    newProducts.splice(newIndex, 0, movedProduct);

    // Update sort_order for all products in the category
    const updatedProducts = newProducts.map((prod, index) => ({
      ...prod,
      sort_order: index
    }));

    // Update the products state with new order
    setProducts(prevProducts => {
      const otherProducts = prevProducts.filter(p => 
        selectedCategory === 'all' ? true : p.category_id === selectedCategory
      );
      const updatedOtherProducts = otherProducts.map(p => {
        const updatedProduct = updatedProducts.find(up => up.id === p.id);
        return updatedProduct || p;
      });
      
      return prevProducts.map(p => {
        if (selectedCategory === 'all' || p.category_id === selectedCategory) {
          const updatedProduct = updatedProducts.find(up => up.id === p.id);
          return updatedProduct || p;
        }
        return p;
      });
    });

    try {
      // Update the sort order in the database
      const response = await authenticatedApiCallWithBody('/api/admin/products/reorder', {
        products: updatedProducts.map(prod => ({
          id: prod.id,
          sort_order: prod.sort_order
        }))
      }, {
        method: 'PUT'
      });

      if (!response.ok) {
        console.error('Failed to reorder products');
        // Revert on error
        loadData();
      }
    } catch (error) {
      console.error('Error reordering products:', error);
      // Revert on error
      loadData();
    }
  };

  // Toggle product visibility
  const toggleProductVisibility = async (productId: string, currentAvailable: boolean) => {
    setIsUpdatingVisibility(productId);
    
    try {
      const response = await authenticatedApiCallWithBody(`/api/admin/products/${productId}/visibility`, {
        available: !currentAvailable
      }, {
        method: 'PUT'
      });

      if (response.ok) {
        setProducts(prevProducts =>
          prevProducts.map(product =>
            product.id === productId
              ? { ...product, available: !currentAvailable }
              : product
          )
        );
      } else {
        console.error('Failed to update product visibility');
      }
    } catch (error) {
      console.error('Error updating product visibility:', error);
    } finally {
      setIsUpdatingVisibility(null);
    }
  };

  // Filter products by selected category
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category_id === selectedCategory);

  // Get category name by ID
  const getCategoryName = (categoryId?: string) => {
    if (!categoryId) return 'No category';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown category';
  };

  // Handle category drag end
  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = categories.findIndex(cat => cat.id === active.id);
      const newIndex = categories.findIndex(cat => cat.id === over?.id);

      const newCategories = arrayMove(categories, oldIndex, newIndex);
      const updatedCategories = newCategories.map((cat, index) => ({
        ...cat,
        sort_order: index
      }));

      setCategories(updatedCategories);

      try {
        const response = await authenticatedApiCallWithBody('/api/admin/categories/reorder', {
          categories: updatedCategories.map(cat => ({
            id: cat.id,
            sort_order: cat.sort_order
          }))
        }, {
          method: 'PUT'
        });

        if (!response.ok) {
          console.error('Failed to reorder categories');
          loadData();
        }
      } catch (error) {
        console.error('Error reordering categories:', error);
        loadData();
      }
    }
  };

  // Handle product drag end
  const handleProductDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = filteredProducts.findIndex(prod => prod.id === active.id);
      const newIndex = filteredProducts.findIndex(prod => prod.id === over?.id);

      const newProducts = arrayMove(filteredProducts, oldIndex, newIndex);
      const updatedProducts = newProducts.map((prod, index) => ({
        ...prod,
        sort_order: index
      }));

      // Update the products state with new order
      setProducts(prevProducts => {
        return prevProducts.map(p => {
          if (selectedCategory === 'all' || p.category_id === selectedCategory) {
            const updatedProduct = updatedProducts.find(up => up.id === p.id);
            return updatedProduct || p;
          }
          return p;
        });
      });

      try {
        const response = await authenticatedApiCallWithBody('/api/admin/products/reorder', {
          products: updatedProducts.map(prod => ({
            id: prod.id,
            sort_order: prod.sort_order
          }))
        }, {
          method: 'PUT'
        });

        if (!response.ok) {
          console.error('Failed to reorder products');
          loadData();
        }
      } catch (error) {
        console.error('Error reordering products:', error);
        loadData();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show message if no restaurant exists
  if (hasRestaurant === false) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="text-muted-foreground mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className={`${typography.h4} mb-2`}>
            No Restaurant Found
          </h2>
          <p className={`${typography.bodySmall} mb-6`}>
            You need to create a restaurant first before you can manage your menu.
          </p>
          <Button onClick={() => window.location.href = '/admin/settings'}>
            Go to Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className={`${typography.h2} mb-2`}>
          Menu Management
        </h1>
        <p className={typography.bodySmall}>
          Manage your restaurant menu items and categories
        </p>
      </div>

      {/* Quick Actions */}
      <div className={`mb-6 flex flex-wrap ${gaps.sm}`}>
        <Button
          onClick={() => window.location.href = '/admin/categories'}
          className="flex items-center"
        >
          <List className="w-4 h-4 mr-2" />
          Manage Categories
        </Button>
        <Button
          onClick={() => window.location.href = '/admin/products'}
          className="flex items-center"
        >
          <Package className="w-4 h-4 mr-2" />
          Manage Products
        </Button>
        {enableMenuAdmin && (
          <Button
            onClick={() => window.location.href = '/admin/menu/advanced'}
            className="flex items-center"
          >
            <Settings className="w-4 h-4 mr-2" />
            Advanced Menu Settings
          </Button>
        )}
      </div>

      {/* Menu Overview */}
      <div className={`grid grid-cols-1 md:grid-cols-3 ${gaps.md} mb-8`}>
        <Card className={spacing.md}>
          <div className="flex items-center justify-between">
            <div>
              <p className={typography.bodySmall}>Total Categories</p>
              <p className="text-2xl font-bold text-foreground">{categories.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <List className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>

        <Card className={spacing.md}>
          <div className="flex items-center justify-between">
            <div>
              <p className={typography.bodySmall}>Total Products</p>
              <p className="text-2xl font-bold text-foreground">{products.length}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <Package className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className={spacing.md}>
          <div className="flex items-center justify-between">
            <div>
              <p className={typography.bodySmall}>Visible Products</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {products.filter(p => p.available !== false).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <Eye className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
      </div>

             {/* Categories and Products Management */}
       <Card className="p-6 mb-6">
         <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-semibold text-foreground">
             {selectedCategory === 'all' ? 'Categories Order' : `Products in ${getCategoryName(selectedCategory)}`}
           </h2>
           <div className="flex items-center space-x-2">
             {selectedCategory === 'all' ? (
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => setIsReordering(!isReordering)}
               >
                 {isReordering ? 'Done Reordering' : 'Reorder Categories'}
               </Button>
             ) : (
               <>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setSelectedCategory('all')}
                 >
                   ← Back to Categories
                 </Button>
                 <Button
                   variant="outline"
                   size="sm"
                   onClick={() => setIsReorderingProducts(!isReorderingProducts)}
                 >
                   {isReorderingProducts ? 'Done Reordering' : 'Reorder Products'}
                 </Button>
               </>
             )}
           </div>
         </div>
        
        {selectedCategory === 'all' ? (
          // Categories view
          categories.length === 0 ? (
                       <div className="text-center py-8">
             <div className="text-muted-foreground mb-4">
               <List className="w-12 h-12 mx-auto" />
             </div>
             <p className="text-muted-foreground mb-4">
               No categories found. Create your first category to get started.
             </p>
             <button
               onClick={() => window.location.href = '/admin/categories'}
               className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
             >
               Create Category
             </button>
           </div>
                     ) : (
             <DndContext
               sensors={sensors}
               collisionDetection={closestCenter}
               onDragEnd={handleCategoryDragEnd}
             >
               <SortableContext
                 items={categories.map(cat => cat.id)}
                 strategy={verticalListSortingStrategy}
               >
                 <div className="space-y-2">
                   {categories.map((category, index) => {
                     const categoryProducts = products.filter(product => product.category_id === category.id);
                     return (
                       <SortableCategory
                         key={category.id}
                         category={category}
                         index={index}
                         isReordering={isReordering}
                         categoryProducts={categoryProducts}
                         onReorder={reorderCategory}
                         onViewItems={setSelectedCategory}
                       />
                     );
                   })}
                 </div>
               </SortableContext>
             </DndContext>
          )
        ) : (
          // Products view for selected category
          filteredProducts.length === 0 ? (
                         <div className="text-center py-8">
               <div className="text-muted-foreground mb-4">
                 <Package className="w-12 h-12 mx-auto" />
               </div>
               <p className="text-muted-foreground mb-4">
                 No products in this category.
               </p>
               <button
                 onClick={() => window.location.href = '/admin/products'}
                 className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
               >
                 Add Product
               </button>
             </div>
                     ) : (
             <DndContext
               sensors={sensors}
               collisionDetection={closestCenter}
               onDragEnd={handleProductDragEnd}
             >
               <SortableContext
                 items={filteredProducts.map(prod => prod.id)}
                 strategy={verticalListSortingStrategy}
               >
                 <div className="overflow-x-auto">
                   <table className="w-full min-w-[600px]">
                     <thead>
                       <tr className="border-b border-border">
                         {isReorderingProducts && (
                           <th className="text-left py-3 px-4 font-medium text-foreground">Order</th>
                         )}
                         <th className="text-left py-3 px-4 font-medium text-foreground">Name</th>
                         <th className="text-left py-3 px-4 font-medium text-foreground">Price</th>
                         <th className="text-left py-3 px-4 font-medium text-foreground">Visibility</th>
                         <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                       </tr>
                     </thead>
                     <tbody>
                       {filteredProducts.map((product, index) => (
                         <SortableProduct
                           key={product.id}
                           product={product}
                           index={index}
                           isReordering={isReorderingProducts}
                           onReorder={reorderProduct}
                           onToggleVisibility={toggleProductVisibility}
                           isUpdatingVisibility={isUpdatingVisibility}
                         />
                       ))}
                     </tbody>
                   </table>
                 </div>
               </SortableContext>
             </DndContext>
          )
        )}
      </Card>

             {/* All Products Overview */}
       <Card className="p-6">
         <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-semibold text-foreground">
             All Menu Items
           </h2>
           <div className="flex items-center space-x-4">
             <select
               value={selectedCategory}
               onChange={(e) => setSelectedCategory(e.target.value)}
               className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-ring bg-background text-foreground"
             >
               <option value="all">All Categories</option>
               {categories.map((category) => (
                 <option key={category.id} value={category.id}>
                   {category.name}
                 </option>
               ))}
             </select>
             <button
               onClick={() => window.location.href = '/admin/products'}
               className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
             >
               Add Product
             </button>
           </div>
         </div>
        
        {products.length === 0 ? (
                     <div className="text-center py-8">
             <div className="text-muted-foreground mb-4">
               <Package className="w-12 h-12 mx-auto" />
             </div>
             <p className="text-muted-foreground mb-4">
               No products found. Create your first product to get started.
             </p>
             <button
               onClick={() => window.location.href = '/admin/products'}
               className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
             >
               Add Product
             </button>
           </div>
        ) : (
                     <div className="overflow-x-auto">
             <table className="w-full min-w-[600px]">
               <thead>
                 <tr className="border-b border-border">
                   <th className="text-left py-3 px-4 font-medium text-foreground">Name</th>
                   <th className="text-left py-3 px-4 font-medium text-foreground">Category</th>
                   <th className="text-left py-3 px-4 font-medium text-foreground">Price</th>
                   <th className="text-left py-3 px-4 font-medium text-foreground">Visibility</th>
                   <th className="text-left py-3 px-4 font-medium text-foreground">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {products.map((product) => (
                   <tr key={product.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                     <td className="py-3 px-4 text-foreground font-medium">
                       {product.name}
                     </td>
                     <td className="py-3 px-4 text-muted-foreground">
                       {getCategoryName(product.category_id)}
                     </td>
                     <td className="py-3 px-4 text-foreground font-medium">
                       ${product.price.toFixed(2)}
                     </td>
                     <td className="py-3 px-4">
                       <div className="flex items-center space-x-2">
                         <Switch
                           checked={product.available !== false}
                           onCheckedChange={() => toggleProductVisibility(product.id, product.available !== false)}
                           disabled={isUpdatingVisibility === product.id}
                         />
                         <span className="text-sm text-muted-foreground">
                           {product.available !== false ? 'Visible' : 'Hidden'}
                         </span>
                       </div>
                     </td>
                     <td className="py-3 px-4">
                       <div className="flex space-x-2">
                         <button 
                           onClick={() => window.location.href = `/admin/products?edit=${product.id}`}
                           className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                         >
                           Edit
                         </button>
                         <button 
                           onClick={() => window.location.href = `/admin/products`}
                           className="text-destructive hover:text-destructive/80 text-sm font-medium transition-colors"
                         >
                           Delete
                         </button>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        )}
      </Card>

      {/* Feature Flag Notice */}
      {!enableMenuAdmin && (
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Advanced Menu Management
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  Advanced menu management features (ordering, visibility controls, daily specials) are currently disabled. 
                  Set <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">NEXT_PUBLIC_ENABLE_MENU_ADMIN=true</code> to enable these features.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
