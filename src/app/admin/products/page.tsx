'use client';

import { authenticatedApiCall } from '@/lib/api-helpers';
import { useState, useEffect, useCallback } from 'react';
import { typography, spacing } from '@/lib/design-system';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import BulkUploadModal from '../../../components/admin/BulkUploadModal';
import ProductForm from '../../../components/admin/ProductForm';
import ProductList from '../../../components/admin/ProductList';
import NoRestaurantMessage from '../../../components/admin/NoRestaurantMessage';

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
  categories?: {
    name: string;
  };
  // AI-generated fields
  generated_description?: string;
  recipe?: Array<{ ingredient: string; quantity: string }>;
  allergens?: string[];
  manual_language_override?: 'ro' | 'en';
  ai_generated_at?: string;
  ai_last_updated?: string;
}

interface Category {
  id: string;
  name: string;
  restaurant_id: string;
  created_at: string;
}

export default function AdminProducts() {
  
  // Get authenticated user
  const { user, isLoading: authLoading } = useAuth();
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingProductId, setRegeneratingProductId] = useState<string | null>(null);
  const [isRegeneratingAll, setIsRegeneratingAll] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

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

  const handleAddNew = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (product: Product) => {
    try {
      const response = await authenticatedApiCall(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
        loadData(); // Reload data
      } else {
        const errorData = await response.json();
        console.error(errorData.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingProduct(null);
    loadData();
  };

  const handleBulkUploadSuccess = () => {
    loadData();
  };

  // AI Regeneration Functions
  const handleRegenerate = async (product: Product) => {
    try {
      setIsRegenerating(true);
      setRegeneratingProductId(product.id);

      const response = await authenticatedApiCall('/api/generate-product-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: [{
            id: product.id,
            name: product.name,
            manual_language_override: product.manual_language_override
          }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('AI regeneration successful:', data);
        await loadData(); // Reload products to show updated data
      } else {
        const errorData = await response.json();
        console.error('AI regeneration failed:', errorData);
        alert(`Failed to regenerate product data: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error during AI regeneration:', error);
      alert('Error during AI regeneration. Please try again.');
    } finally {
      setIsRegenerating(false);
      setRegeneratingProductId(null);
    }
  };

  const handleRegenerateAll = async () => {
    try {
      setIsRegeneratingAll(true);
      
      // Get products that don't have AI-generated descriptions or recipes
      const productsNeedingGeneration = products.filter(product => 
        !product.generated_description && (!product.recipe || product.recipe.length === 0)
      );

      if (productsNeedingGeneration.length === 0) {
        alert('All products already have AI-generated content.');
        return;
      }

      if (!confirm(`This will generate AI content for ${productsNeedingGeneration.length} products. Continue?`)) {
        return;
      }

      // Process in batches of 10 (API limit)
      const batchSize = 10;
      for (let i = 0; i < productsNeedingGeneration.length; i += batchSize) {
        const batch = productsNeedingGeneration.slice(i, i + batchSize);
        
        const response = await authenticatedApiCall('/api/generate-product-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            products: batch.map(product => ({
              id: product.id,
              name: product.name,
              manual_language_override: product.manual_language_override
            }))
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Batch ${i / batchSize + 1} failed:`, errorData);
          // Continue with remaining batches
        }
      }

      await loadData(); // Reload products to show updated data
      alert(`AI regeneration completed for ${productsNeedingGeneration.length} products.`);
    } catch (error) {
      console.error('Error during bulk AI regeneration:', error);
      alert('Error during bulk regeneration. Please try again.');
    } finally {
      setIsRegeneratingAll(false);
    }
  };

  // Filter products based on selected category
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(product => product.category_id === selectedCategory);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show message if no restaurant exists
  if (hasRestaurant === false) {
    return (
      <div>
        
        <div className="mb-6">
          <h1 className={`${typography.h2} mb-2`}>
            Product Management
          </h1>
          <p className={typography.bodySmall}>
            Manage your menu products and their details
          </p>
        </div>

        <NoRestaurantMessage />
      </div>
    );
  }

  return (
    <div>
      
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h1 className={`${typography.h2} mb-2 break-words`}>
              Product Management
            </h1>
            <p className={`${typography.bodySmall} break-words`}>
              Manage your menu products and their details
            </p>
          </div>
        </div>
      </div>

      {/* Add Product Buttons and Filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleAddNew} className="flex items-center w-full sm:w-auto min-h-[44px]">
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="whitespace-nowrap">Add New Product</span>
            </Button>
              
            <Button 
              onClick={() => setShowBulkUploadModal(true)}
              variant="outline"
              className="flex items-center w-full sm:w-auto min-h-[44px]"
            >
              <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="whitespace-nowrap">Bulk Upload Menu</span>
            </Button>

            <Button 
              onClick={handleRegenerateAll}
              variant="outline"
              disabled={isRegeneratingAll || products.length === 0}
              className="flex items-center w-full sm:w-auto min-h-[44px] bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
            >
              {isRegeneratingAll ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2 flex-shrink-0"></div>
                  <span className="whitespace-nowrap">Generating AI...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="whitespace-nowrap">Regenerate All</span>
                </>
              )}
            </Button>
          </div>

          <div className="flex justify-center sm:justify-end">
            <div className="flex space-x-2">
              <Button
                onClick={() => setViewMode('cards')}
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                className="min-h-[44px] min-w-[60px]"
              >
                Cards
              </Button>
              <Button
                onClick={() => setViewMode('table')}
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                className="min-h-[44px] min-w-[60px]"
              >
                Table
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 break-words">Filter by Category:</span>
          <div className="flex flex-wrap gap-2 max-w-full">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="text-xs min-h-[44px] flex-shrink-0"
            >
              All Products
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="text-xs min-h-[44px] break-words flex-shrink-0 max-w-full"
              >
                <span className="truncate">{category.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Form */}
      <ProductForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleFormSuccess}
        showSuccess={(msg) => console.log(msg)}
        showError={(msg) => console.error(msg)}
        categories={categories}
        editingProduct={editingProduct}
        user={user}
      />

      {/* Products List */}
      <Card className={spacing.md}>
        <h2 className={`${typography.h4} mb-4`}>
          Products ({filteredProducts.length} of {products.length})
        </h2>
        
        <ProductList
          products={filteredProducts}
          viewMode={viewMode}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddNew={handleAddNew}
          onRegenerate={handleRegenerate}
          isRegenerating={isRegenerating}
          regeneratingProductId={regeneratingProductId || undefined}
        />
      </Card>
                
      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSuccess={handleBulkUploadSuccess}
        showSuccess={(msg) => console.log(msg)}
        showError={(msg) => console.error(msg)}
        user={user}
      />
    </div>
  );
}
