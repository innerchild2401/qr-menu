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
import RecipeTagManager from '../../../components/admin/RecipeTagManager';
import LanguageConsistencyChecker from '../../../components/admin/LanguageConsistencyChecker';

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
  // Recipe management
  has_recipe?: boolean;
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
  const [showRecipeManager, setShowRecipeManager] = useState(false);
  const [showLanguageChecker, setShowLanguageChecker] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      console.log('🔄 loadData called - refreshing products data...');
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
        console.log('📦 Fresh products data loaded:', productsData.products?.length || 0, 'products');
        // Log a few sample products to check if descriptions are updated
        const sampleProducts = productsData.products?.slice(0, 3) || [];
        sampleProducts.forEach((p: any, i: number) => {
          console.log(`  ${i + 1}. ${p.name}: has_description=${!!p.generated_description}`);
        });
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
      // Validate product data before proceeding
      if (!product) {
        console.error('No product provided to handleRegenerate');
        alert('Error: No product data available for regeneration');
        return;
      }

      // Handle both string and number IDs from the database
      if (!product.id || (typeof product.id !== 'string' && typeof product.id !== 'number')) {
        console.error('Invalid product ID:', { id: product.id, type: typeof product.id });
        alert('Error: Invalid product ID for regeneration');
        return;
      }

      if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
        console.error('Invalid product name:', { name: product.name, type: typeof product.name });
        alert('Error: Invalid product name for regeneration');
        return;
      }

      setIsRegenerating(true);
      setRegeneratingProductId(product.id);

      // Debug logging
      console.log('Product for regeneration:', {
        id: product.id,
        name: product.name,
        manual_language_override: product.manual_language_override,
        idType: typeof product.id,
        nameType: typeof product.name
      });

      const requestPayload = {
        products: [{
          id: String(product.id).trim(), // Ensure it's a string and trimmed
          name: String(product.name).trim(), // Ensure it's a string and trimmed
          ...(product.manual_language_override && ['ro', 'en'].includes(product.manual_language_override) 
            ? { manual_language_override: product.manual_language_override } 
            : {})
        }],
        scenario: 'force' as const,
        respect_cost_limits: true
      };

      console.log('Request payload:', requestPayload);
      console.log('ID type after conversion:', typeof requestPayload.products[0].id);
      console.log('ID value after conversion:', requestPayload.products[0].id);

      const response = await authenticatedApiCall('/api/generate-product-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('AI regeneration successful:', data);
        await loadData(); // Reload products to show updated data
        alert(`Product "${product.name}" successfully regenerated with AI data!`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('AI regeneration failed:', errorData);
        alert(`Failed to regenerate product "${product.name}": ${errorData.error || 'Unknown error'}`);
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
      const productsNeedingGeneration = products.filter(product => {
        // Validate product data
        // Handle both string and number IDs from the database
        if (!product.id || (typeof product.id !== 'string' && typeof product.id !== 'number')) {
          console.warn('Skipping product with invalid ID:', product);
          return false;
        }
        if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
          console.warn('Skipping product with invalid name:', product);
          return false;
        }
        
        // Only include products that don't have AI-generated content yet
        // If has_recipe column exists, only include products with recipes
        const hasRecipe = product.has_recipe !== false; // true if has_recipe is true or undefined
        return hasRecipe && !product.generated_description && (!product.recipe || product.recipe.length === 0);
      });

      if (productsNeedingGeneration.length === 0) {
        alert('No products need AI generation. Make sure products are marked as having recipes and don\'t already have AI-generated content.');
        return;
      }

      if (!confirm(`This will generate AI content for ${productsNeedingGeneration.length} products. Continue?`)) {
        return;
      }

      // Process in batches of 10 (API limit)
      const batchSize = 10;
      console.log(`Starting batch regeneration for ${productsNeedingGeneration.length} products`);
      console.log('Products needing generation:', productsNeedingGeneration.map(p => ({
        id: p.id,
        idType: typeof p.id,
        name: p.name,
        nameType: typeof p.name
      })));
      
      for (let i = 0; i < productsNeedingGeneration.length; i += batchSize) {
        const batch = productsNeedingGeneration.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1} with ${batch.length} products`);
        
        const response = await authenticatedApiCall('/api/generate-product-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            products: batch.map(product => ({
              id: String(product.id).trim(),
              name: String(product.name).trim(),
              ...(product.manual_language_override && ['ro', 'en'].includes(product.manual_language_override) 
                ? { manual_language_override: product.manual_language_override } 
                : {})
            })),
            scenario: 'regenerate_all' as const,
            respect_cost_limits: true
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
          console.error(`Batch ${Math.floor(i / batchSize) + 1} failed:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          console.error(`Batch ${Math.floor(i / batchSize) + 1} products:`, batch.map(p => ({
            id: p.id,
            idType: typeof p.id,
            name: p.name,
            nameType: typeof p.name
          })));
          // Continue with remaining batches
        } else {
          console.log(`Batch ${Math.floor(i / batchSize) + 1} completed successfully`);
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

      {/* Action Buttons */}
      <Card className={spacing.md}>
        <div className="flex flex-col space-y-4">
          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleAddNew} className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Product
              </Button>
              
              <Button 
                onClick={() => setShowBulkUploadModal(true)}
                variant="outline"
                className="flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Bulk Upload Menu
              </Button>

              <Button 
                onClick={() => setShowRecipeManager(!showRecipeManager)}
                variant="outline"
                className="flex items-center justify-center bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showRecipeManager ? 'Hide Recipe Manager' : 'Manage Recipe Tags'}
              </Button>

              <Button 
                onClick={() => setShowLanguageChecker(!showLanguageChecker)}
                variant="outline"
                className="flex items-center justify-center bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                {showLanguageChecker ? 'Hide Language Checker' : 'Check Language Consistency'}
              </Button>

              <Button 
                onClick={handleRegenerateAll}
                variant="outline"
                disabled={isRegeneratingAll || products.length === 0}
                className="flex items-center justify-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
              >
                {isRegeneratingAll ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                    Generating AI...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regenerate All
                  </>
                )}
              </Button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                onClick={() => setViewMode('cards')}
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
              >
                Cards
              </Button>
              <Button
                onClick={() => setViewMode('table')}
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
              >
                Table
              </Button>
            </div>
          </div>

          {/* Category Filters */}
          <div className="border-t pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Filter by Category:</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  All Products
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <span className="truncate max-w-32">{category.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

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

      {/* Recipe Tag Manager */}
      {showRecipeManager && (
        <RecipeTagManager
          products={products}
          categories={categories}
          onUpdate={loadData}
        />
      )}

      {/* Language Consistency Checker */}
      {showLanguageChecker && (
        <LanguageConsistencyChecker
          products={products}
          onUpdate={loadData}
        />
      )}

      {/* Products List */}
      <Card className={spacing.md}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={typography.h4}>
            Products
          </h2>
          <span className="text-sm text-muted-foreground">
            {filteredProducts.length} of {products.length} items
          </span>
        </div>
        
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
