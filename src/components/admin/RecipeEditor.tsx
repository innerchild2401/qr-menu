'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authenticatedApiCall } from '@/lib/api-helpers';

interface RecipeIngredient {
  ingredient: string;
  quantity: string;
}

interface Product {
  id: string;
  name: string;
  recipe?: RecipeIngredient[];
  has_recipe?: boolean;
  manual_language_override?: 'ro' | 'en';
}

interface RecipeEditorProps {
  product: Product;
  onClose: () => void;
  onUpdate: () => void;
}

export default function RecipeEditor({ product, onClose, onUpdate }: RecipeEditorProps) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Initialize with existing recipe or empty ingredients
    if (product.recipe && Array.isArray(product.recipe)) {
      setIngredients([...product.recipe]);
    } else {
      setIngredients([{ ingredient: '', quantity: '' }]);
    }
  }, [product]);

  const addIngredient = () => {
    setIngredients([...ingredients, { ingredient: '', quantity: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: 'ingredient' | 'quantity', value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSave = async () => {
    // Filter out empty ingredients
    const validIngredients = ingredients.filter(
      ing => ing.ingredient.trim() && ing.quantity.trim()
    );

    if (validIngredients.length === 0) {
      alert('Please add at least one ingredient with quantity');
      return;
    }

    setIsUpdating(true);
    try {
      // First, save the recipe
      const response = await authenticatedApiCall(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipe: validIngredients,
          has_recipe: true
        })
      });

      if (response.ok) {
        // After saving recipe, automatically trigger AI regeneration
        console.log('Recipe saved, triggering AI regeneration...');
        
        const regenerateResponse = await authenticatedApiCall('/api/generate-product-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            products: [{
              id: product.id.toString(),
              name: product.name,
              manual_language_override: product.manual_language_override
            }],
            scenario: 'force',
            respect_cost_limits: true,
            regenerationMode: 'description' // Use description-only mode to preserve the edited recipe
          })
        });

        if (regenerateResponse.ok) {
          onUpdate();
          onClose();
          alert('Recipe saved and AI content regenerated successfully!');
        } else {
          onUpdate();
          onClose();
          alert('Recipe saved, but AI regeneration failed. You can manually regenerate later.');
        }
      } else {
        const errorData = await response.json();
        alert(`Failed to update recipe: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('Error updating recipe. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRegenerateAI = async () => {
    if (!confirm('This will regenerate AI content for this product. Continue?')) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await authenticatedApiCall('/api/generate-product-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: [{
            id: product.id.toString(),
            name: product.name,
            manual_language_override: product.manual_language_override
          }],
          scenario: 'force',
          respect_cost_limits: true,
          regenerationMode: 'description' // Use description-only mode to preserve the edited recipe
        })
      });

      if (response.ok) {
        onUpdate();
        alert('AI content regenerated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to regenerate AI content: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error regenerating AI content:', error);
      alert('Error regenerating AI content. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Recipe: {product.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Add or modify ingredients for this product
              </p>
            </div>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUpdating}
            >
              ✕
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recipe Ingredients
              </label>
              <div className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <div className="flex-1">
                      <Input
                        placeholder="Ingredient name"
                        value={ingredient.ingredient}
                        onChange={(e) => updateIngredient(index, 'ingredient', e.target.value)}
                        disabled={isUpdating}
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Quantity (e.g., 100g, 1 cup)"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                        disabled={isUpdating}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeIngredient(index)}
                      disabled={isUpdating || ingredients.length === 1}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={addIngredient}
                disabled={isUpdating}
                className="mt-3"
              >
                + Add Ingredient
              </Button>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isUpdating}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isUpdating ? 'Saving...' : 'Save Recipe'}
                </Button>
                <Button
                  onClick={handleRegenerateAI}
                  disabled={isUpdating}
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                >
                  {isUpdating ? 'Regenerating...' : 'Regenerate AI Content'}
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isUpdating}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
