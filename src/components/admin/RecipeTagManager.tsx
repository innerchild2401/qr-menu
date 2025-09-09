'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { authenticatedApiCall } from '@/lib/api-helpers';

interface Product {
  id: string;
  name: string;
  category_id?: string;
  has_recipe?: boolean;
  categories?: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  restaurant_id: string;
}

interface RecipeTagManagerProps {
  products: Product[];
  categories: Category[];
  onUpdate: () => void;
}

export default function RecipeTagManager({ products, categories, onUpdate }: RecipeTagManagerProps) {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);
  const [showOnlyUntagged, setShowOnlyUntagged] = useState(true);

  // Filter products based on showOnlyUntagged setting
  const filteredProducts = showOnlyUntagged 
    ? products.filter(product => product.has_recipe === undefined || product.has_recipe === false)
    : products;

  // Group products by category
  const productsByCategory = filteredProducts.reduce((acc, product) => {
    const categoryId = product.category_id || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const handleProductToggle = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
      // Remove all products from this category
      const categoryProducts = productsByCategory[categoryId] || [];
      categoryProducts.forEach(product => {
        selectedProducts.delete(product.id);
      });
      setSelectedProducts(new Set(selectedProducts));
    } else {
      newSelected.add(categoryId);
      // Add all products from this category
      const categoryProducts = productsByCategory[categoryId] || [];
      const newProductSelection = new Set(selectedProducts);
      categoryProducts.forEach(product => {
        newProductSelection.add(product.id);
      });
      setSelectedProducts(newProductSelection);
    }
    setSelectedCategories(newSelected);
  };

  const handleSelectAll = () => {
    const allProductIds = new Set(filteredProducts.map(p => p.id));
    setSelectedProducts(allProductIds);
    const allCategoryIds = new Set(Object.keys(productsByCategory));
    setSelectedCategories(allCategoryIds);
  };

  const handleDeselectAll = () => {
    setSelectedProducts(new Set());
    setSelectedCategories(new Set());
  };

  const handleUpdateRecipeTags = async (hasRecipe: boolean) => {
    if (selectedProducts.size === 0) return;

    setIsUpdating(true);
    try {
      const productIds = Array.from(selectedProducts);
      
      const response = await authenticatedApiCall('/api/admin/products/bulk-update-recipe-tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds,
          has_recipe: hasRecipe
        })
      });

      if (response.ok) {
        onUpdate();
        setSelectedProducts(new Set());
        setSelectedCategories(new Set());
      } else {
        const errorData = await response.json();
        alert(`Failed to update recipe tags: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating recipe tags:', error);
      alert('Error updating recipe tags. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getCategoryName = (categoryId: string) => {
    if (categoryId === 'uncategorized') return 'Uncategorized';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recipe Tag Management
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Mark products that have recipes for AI description generation
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <Checkbox
              checked={showOnlyUntagged}
              onCheckedChange={(checked) => setShowOnlyUntagged(checked === true)}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Show only untagged products
            </span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredProducts.length === 0}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={selectedProducts.size === 0}
          >
            Deselect All
          </Button>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {selectedProducts.size} selected
          </Badge>
        </div>
      </div>

      {selectedProducts.size > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedProducts.size} products selected
            </span>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={() => handleUpdateRecipeTags(true)}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isUpdating ? 'Updating...' : 'Mark as Having Recipe'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateRecipeTags(false)}
                disabled={isUpdating}
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                {isUpdating ? 'Updating...' : 'Mark as No Recipe'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(productsByCategory).map(([categoryId, categoryProducts]) => (
          <div key={categoryId} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedCategories.has(categoryId)}
                  onCheckedChange={() => handleCategoryToggle(categoryId)}
                />
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {getCategoryName(categoryId)}
                </h4>
                <Badge variant="outline">
                  {categoryProducts.length} products
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {categoryProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center space-x-2 p-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <Checkbox
                    checked={selectedProducts.has(product.id)}
                    onCheckedChange={() => handleProductToggle(product.id)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                    {product.name}
                  </span>
                  {product.has_recipe && (
                    <Badge variant="default" className="text-xs">
                      Has Recipe
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {showOnlyUntagged 
            ? 'All products have been tagged with recipe status'
            : 'No products found'
          }
        </div>
      )}
    </Card>
  );
}
