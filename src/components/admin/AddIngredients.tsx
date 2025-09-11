'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button-improved';
import { Input } from '@/components/ui/input';
import { Wand2, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RecipeIngredient {
  ingredient: string;
  quantity: string;
}

interface AddIngredientsProps {
  ingredients: RecipeIngredient[];
  onIngredientsChange: (ingredients: RecipeIngredient[]) => void;
  onNormalizeIngredients?: () => void;
  isNormalizing?: boolean;
  className?: string;
}

export default function AddIngredients({
  ingredients,
  onIngredientsChange,
  onNormalizeIngredients,
  isNormalizing = false,
  className
}: AddIngredientsProps) {
  const [newIngredient, setNewIngredient] = useState({ ingredient: '', quantity: '' });
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const ingredientRefs = useRef<(HTMLInputElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus and scroll to newly added ingredient
  useEffect(() => {
    if (focusedIndex !== null && ingredientRefs.current[focusedIndex]) {
      const input = ingredientRefs.current[focusedIndex];
      if (input) {
        input.focus();
        input.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
      setFocusedIndex(null);
    }
  }, [focusedIndex]);

  const addIngredient = () => {
    if (newIngredient.ingredient.trim() || newIngredient.quantity.trim()) {
      const updatedIngredients = [...ingredients, newIngredient];
      onIngredientsChange(updatedIngredients);
      setFocusedIndex(ingredients.length); // Focus the newly added ingredient
    } else {
      // Add empty ingredient and focus it
      const updatedIngredients = [...ingredients, { ingredient: '', quantity: '' }];
      onIngredientsChange(updatedIngredients);
      setFocusedIndex(ingredients.length);
    }
    setNewIngredient({ ingredient: '', quantity: '' });
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      const updatedIngredients = ingredients.filter((_, i) => i !== index);
      onIngredientsChange(updatedIngredients);
      
      // Update refs array
      ingredientRefs.current = ingredientRefs.current.filter((_, i) => i !== index);
    }
  };

  const updateIngredient = (index: number, field: 'ingredient' | 'quantity', value: string) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    onIngredientsChange(updatedIngredients);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (index === ingredients.length - 1) {
        // If it's the last ingredient, add a new one
        addIngredient();
      } else {
        // Focus next ingredient
        const nextIndex = index + 1;
        if (ingredientRefs.current[nextIndex]) {
          ingredientRefs.current[nextIndex]?.focus();
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(index + 1, ingredients.length - 1);
      if (ingredientRefs.current[nextIndex]) {
        ingredientRefs.current[nextIndex]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(index - 1, 0);
      if (ingredientRefs.current[prevIndex]) {
        ingredientRefs.current[prevIndex]?.focus();
      }
    } else if (e.key === 'Delete' && ingredients.length > 1) {
      // Only delete if ingredient is empty
      const ingredient = ingredients[index];
      if (!ingredient.ingredient.trim() && !ingredient.quantity.trim()) {
        removeIngredient(index);
      }
    }
  };

  const handleNewIngredientKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient();
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Recipe Ingredients
        </label>
        <div className="flex gap-2">
          {onNormalizeIngredients && ingredients.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onNormalizeIngredients}
              disabled={isNormalizing}
              className="text-xs"
            >
              <Wand2 className="w-3 h-3 mr-1" />
              {isNormalizing ? 'Normalizing...' : 'Normalize'}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addIngredient}
            className="text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Ingredient
          </Button>
        </div>
      </div>

      {/* Ingredients list */}
      <div 
        ref={containerRef}
        className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50"
      >
        {ingredients.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 dark:text-gray-500 mb-2">
              <Plus className="w-8 h-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No ingredients added yet. Click &ldquo;Add Ingredient&rdquo; to start building the recipe.
            </p>
          </div>
        ) : (
          ingredients.map((ingredient, index) => (
            <div 
              key={index} 
              className="flex gap-2 items-center group"
            >
              <div className="flex-1">
                <Input
                  ref={(el) => {
                    ingredientRefs.current[index] = el;
                  }}
                  type="text"
                  value={ingredient.ingredient}
                  onChange={(e) => updateIngredient(index, 'ingredient', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="text-sm"
                  placeholder="Ingredient name"
                  aria-label={`Ingredient ${index + 1} name`}
                />
              </div>
              <div className="w-24">
                <Input
                  type="text"
                  value={ingredient.quantity}
                  onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="text-sm"
                  placeholder="Quantity"
                  aria-label={`Ingredient ${index + 1} quantity`}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => removeIngredient(index)}
                disabled={ingredients.length === 1}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                aria-label={`Remove ingredient ${index + 1}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Quick add form */}
      <div className="flex gap-2 items-center">
        <div className="flex-1">
          <Input
            type="text"
            value={newIngredient.ingredient}
            onChange={(e) => setNewIngredient({ ...newIngredient, ingredient: e.target.value })}
            onKeyDown={handleNewIngredientKeyDown}
            className="text-sm"
            placeholder="Quick add ingredient name"
            aria-label="Quick add ingredient name"
          />
        </div>
        <div className="w-24">
          <Input
            type="text"
            value={newIngredient.quantity}
            onChange={(e) => setNewIngredient({ ...newIngredient, quantity: e.target.value })}
            onKeyDown={handleNewIngredientKeyDown}
            className="text-sm"
            placeholder="Quantity"
            aria-label="Quick add quantity"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addIngredient}
          disabled={!newIngredient.ingredient.trim() && !newIngredient.quantity.trim()}
          className="text-xs"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add
        </Button>
      </div>

      {ingredients.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          💡 Tip: Use Enter to move between fields, Arrow keys to navigate, and Delete to remove empty ingredients.
        </p>
      )}
    </div>
  );
}
