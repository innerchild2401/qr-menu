'use client';

import { useState } from 'react';
import { authenticatedApiCall } from '../../../lib/api-helpers';

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

interface ProductListProps {
  products: Product[];
  viewMode: 'table' | 'cards';
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAddNew: () => void;
  onRegenerate?: (product: Product) => void;
  isRegenerating?: boolean;
  regeneratingProductId?: string;
}

export default function ProductList({ 
  products, 
  viewMode, 
  onEdit, 
  onDelete, 
  onAddNew,
  onRegenerate,
  isRegenerating = false,
  regeneratingProductId
}: ProductListProps) {
  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await authenticatedApiCall(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await response.json();
        // The parent component will handle the success message and data refresh
        onDelete(product);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      throw error;
    }
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-muted-foreground mb-4">
          No products found. Create your first product to get started.
        </p>
        <button
          onClick={onAddNew}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Add First Product
        </button>
      </div>
    );
  }

  if (viewMode === 'table') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-medium text-foreground">Image</th>
              <th className="text-left py-3 px-4 font-medium text-foreground">Name</th>
              <th className="text-left py-3 px-4 font-medium text-foreground">Category</th>
              <th className="text-left py-3 px-4 font-medium text-foreground">Price</th>
              <th className="text-right py-3 px-4 font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border/50">
                <td className="py-3 px-4">
                  {product.image_url ? (
                    <div
                      style={{
                        backgroundImage: `url(${product.image_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }}
                      className="w-12 h-12 rounded-lg"
                      role="img"
                      aria-label={product.name}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {product.name}
                      {product.has_recipe && (
                        <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                          Recipe
                        </span>
                      )}
                    </div>
                    {product.description && (
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {product.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-muted-foreground">
                  {product.categories?.name || 'No category'}
                </td>
                <td className="py-3 px-4 text-foreground font-medium">
                  ${product.price.toFixed(2)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => onEdit(product)}
                      className="text-primary hover:text-primary/80 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="text-destructive hover:text-destructive/80 text-sm font-medium"
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
    );
  }

  // Enhanced card view with AI features
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onEdit={onEdit}
          onDelete={handleDelete}
          onRegenerate={onRegenerate}
          isRegenerating={isRegenerating && regeneratingProductId === product.id}
        />
      ))}
    </div>
  );
}

// Enhanced Product Card Component with AI Features
interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onRegenerate?: (product: Product) => void;
  isRegenerating: boolean;
}

function ProductCard({ product, onEdit, onDelete, onRegenerate, isRegenerating }: ProductCardProps) {
  const [showRecipe, setShowRecipe] = useState(false);
  
  // Get the description to display (AI-generated takes priority)
  const displayDescription = product.generated_description || product.description;
  const hasRecipe = product.recipe && product.recipe.length > 0;
  const hasNutrition = product.nutrition && typeof product.nutrition === 'object';
  const hasAllergens = product.allergens && product.allergens.length > 0;

  // Parse nutrition data
  const nutrition = hasNutrition ? {
    calories: typeof product.nutrition?.calories === 'number' ? product.nutrition.calories : 
              typeof product.nutrition?.calories === 'string' ? parseFloat(product.nutrition.calories) : null,
    protein: typeof product.nutrition?.protein === 'number' ? product.nutrition.protein : 
             typeof product.nutrition?.protein === 'string' ? product.nutrition.protein : null,
    carbs: typeof product.nutrition?.carbs === 'number' ? product.nutrition.carbs : 
           typeof product.nutrition?.carbs === 'string' ? product.nutrition.carbs : null,
    fat: typeof product.nutrition?.fat === 'number' ? product.nutrition.fat : 
        typeof product.nutrition?.fat === 'string' ? product.nutrition.fat : null,
  } : null;

  return (
    <div className="overflow-hidden hover:shadow-lg transition-all duration-300 min-h-[320px] flex flex-col rounded-xl border bg-card text-card-foreground shadow-sm">
      {/* Header with name, price, and language indicator */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-lg line-clamp-1">
                {product.name}
              </h3>
              {product.manual_language_override && (
                <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                  {product.manual_language_override.toUpperCase()}
                </span>
              )}
              {product.ai_generated_at && (
                <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full">
                  AI
                </span>
              )}
              {product.has_recipe && (
                <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full">
                  Recipe
                </span>
              )}
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <div className="text-lg font-bold text-primary">
              ${product.price.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Description/Recipe Toggle */}
      {(displayDescription || hasRecipe) && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setShowRecipe(false)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                !showRecipe
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Description
            </button>
            {hasRecipe && (
              <button
                onClick={() => setShowRecipe(true)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  showRecipe
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                Recipe
              </button>
            )}
          </div>
          
          {/* Content Display */}
          <div className="text-sm text-muted-foreground">
            {showRecipe && hasRecipe ? (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {product.recipe!.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-xs">{item.ingredient}</span>
                    <span className="text-xs font-medium">{item.quantity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {displayDescription ? (
                  displayDescription.length > 80 ? 
                    `${displayDescription.slice(0, 80)}...` : 
                    displayDescription
                ) : (
                  <span className="text-gray-400 italic">No description available</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image */}
      {product.image_url && (
        <div className="px-4 pb-2">
          <div className="w-full h-24 relative rounded-lg overflow-hidden bg-muted">
            <div
              style={{
                backgroundImage: `url(${product.image_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
              className="w-full h-full"
              role="img"
              aria-label={product.name}
            />
          </div>
        </div>
      )}

      {/* Nutritional Facts */}
      {nutrition && (
        <div className="px-4 pb-2">
          <div className="bg-muted/50 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-foreground mb-2">Nutritional Facts (per portion)</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {nutrition.calories && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calories:</span>
                  <span className="font-medium text-foreground">{nutrition.calories} kcal</span>
                </div>
              )}
              {nutrition.protein && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protein:</span>
                  <span className="font-medium text-foreground">{nutrition.protein}g</span>
                </div>
              )}
              {nutrition.carbs && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carbs:</span>
                  <span className="font-medium text-foreground">{nutrition.carbs}g</span>
                </div>
              )}
              {nutrition.fat && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fat:</span>
                  <span className="font-medium text-foreground">{nutrition.fat}g</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Allergens */}
      {hasAllergens && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1">
            <span className="text-xs text-muted-foreground mr-1">Allergens:</span>
            {product.allergens!.map((allergen, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-destructive/10 text-destructive rounded-full"
              >
                {allergen}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Category and Actions - pinned to bottom */}
      <div className="px-4 pb-4 mt-auto">
        <div className="flex items-center justify-between gap-3">
          {/* Category Info - Left Side */}
          <div className="flex-1">
            {product.categories?.name && (
              <div className="p-2 bg-muted/50 rounded-md">
                <span className="text-xs text-muted-foreground font-medium">
                  {product.categories.name}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons - Right Side */}
          <div className="flex-shrink-0 flex gap-2">
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(product)}
                disabled={isRegenerating}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1"
              >
                {isRegenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    <span>AI...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Regen
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => onEdit(product)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(product)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-md text-sm font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
