'use client';

import { useState, useRef, useEffect } from 'react';
import { authenticatedApiCallWithBody } from '../../../lib/api-helpers';
import { Button } from '@/components/ui/button-improved';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Snowflake, Leaf, Flame, Upload, X } from 'lucide-react';
import { normalizeIngredients } from '@/lib/ai/ingredient-normalizer';
import AddIngredients from './AddIngredients';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
  nutrition?: Record<string, unknown>;
  is_frozen?: boolean;
  is_vegetarian?: boolean;
  is_spicy?: boolean;
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

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category_id: string;
  is_frozen: boolean;
  is_vegetarian: boolean;
  is_spicy: boolean;
  manual_language_override: '' | 'ro' | 'en';
  nutrition: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    sugars: string;
    salts: string;
  };
  // AI-generated fields
  generated_description: string;
  recipe: Array<{ ingredient: string; quantity: string }>;
  allergens: string[];
}

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  categories: Category[];
  editingProduct: Product | null;
  user: { id: string; email?: string } | null;
}

export default function ProductFormImproved({ 
  isOpen, 
  onClose, 
  onSuccess, 
  showSuccess, 
  showError, 
  categories, 
  editingProduct, 
  user 
}: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isNormalizingIngredients, setIsNormalizingIngredients] = useState(false);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_frozen: false,
    is_vegetarian: false,
    is_spicy: false,
    manual_language_override: '',
    nutrition: {
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      sugars: '',
      salts: ''
    },
    // AI-generated fields
    generated_description: '',
    recipe: [],
    allergens: []
  });

  const imageInputRef = useRef<HTMLInputElement>(null);

  // Initialize form data when editing product changes
  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name,
        description: editingProduct.description,
        price: editingProduct.price.toString(),
        category_id: editingProduct.category_id || '',
        is_frozen: editingProduct.is_frozen || false,
        is_vegetarian: editingProduct.is_vegetarian || false,
        is_spicy: editingProduct.is_spicy || false,
        manual_language_override: editingProduct.manual_language_override || '',
        nutrition: {
          calories: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'calories' in editingProduct.nutrition ? String(editingProduct.nutrition.calories) : '',
          protein: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'protein' in editingProduct.nutrition ? String(editingProduct.nutrition.protein) : '',
          carbs: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'carbs' in editingProduct.nutrition ? String(editingProduct.nutrition.carbs) : '',
          fat: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'fat' in editingProduct.nutrition ? String(editingProduct.nutrition.fat) : '',
          sugars: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'sugars' in editingProduct.nutrition ? String(editingProduct.nutrition.sugars) : '',
          salts: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'salts' in editingProduct.nutrition ? String(editingProduct.nutrition.salts) : ''
        },
        // AI-generated fields
        generated_description: editingProduct.generated_description || '',
        recipe: editingProduct.recipe || [],
        allergens: editingProduct.allergens || []
      });
      setImagePreview(editingProduct.image_url || '');
    } else {
      resetForm();
    }
  }, [editingProduct]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      is_frozen: false,
      is_vegetarian: false,
      is_spicy: false,
      manual_language_override: '',
      nutrition: {
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        sugars: '',
        salts: ''
      },
      // AI-generated fields
      generated_description: '',
      recipe: [],
      allergens: []
    });
    setImagePreview('');
  };

  const handleNormalizeIngredients = async () => {
    if (formData.recipe.length === 0) {
      showError('No ingredients to normalize');
      return;
    }

    setIsNormalizingIngredients(true);
    try {
      // Get restaurant ID for semantic normalization
      const response = await fetch('/api/admin/me/restaurant', {
        headers: {
          'x-user-id': user?.id || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get restaurant information');
      }
      
      const restaurantData = await response.json();
      const restaurantId = restaurantData.restaurant?.id;
      
      const normalizedIngredients = await normalizeIngredients(
        formData.recipe, 
        formData.manual_language_override || 'en',
        restaurantId
      );
      
      const normalizedRecipe = normalizedIngredients.map(ing => ({
        ingredient: ing.normalized,
        quantity: ing.quantity
      }));
      
      setFormData({ ...formData, recipe: normalizedRecipe });
      showSuccess('Ingredients normalized successfully!');
    } catch (error) {
      console.error('Error normalizing ingredients:', error);
      showError('Failed to normalize ingredients. Please try again.');
    } finally {
      setIsNormalizingIngredients(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showError('Product name is required');
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      showError('Valid price is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const url = editingProduct 
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const submitData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category_id: formData.category_id || null,
        image_url: imagePreview || null,
        is_frozen: formData.is_frozen,
        is_vegetarian: formData.is_vegetarian,
        is_spicy: formData.is_spicy,
        manual_language_override: formData.manual_language_override || null,
        nutrition: formData.nutrition.calories || formData.nutrition.protein || formData.nutrition.carbs || formData.nutrition.fat || formData.nutrition.sugars || formData.nutrition.salts ? {
          calories: formData.nutrition.calories ? parseInt(formData.nutrition.calories) : null,
          protein: formData.nutrition.protein || null,
          carbs: formData.nutrition.carbs || null,
          fat: formData.nutrition.fat || null,
          sugars: formData.nutrition.sugars || null,
          salts: formData.nutrition.salts || null
        } : null,
        // AI-generated fields
        generated_description: formData.generated_description || null,
        recipe: formData.recipe.length > 0 ? formData.recipe : null,
        allergens: formData.allergens.length > 0 ? formData.allergens : null,
        has_recipe: formData.recipe.length > 0
      };

      const response = await authenticatedApiCallWithBody(url, submitData, {
        method,
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message);
        resetForm();
        onClose();
        onSuccess(); // Reload data
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to save product');
      }
    } catch (error) {
      console.error('Error saving product:', error);
      showError('Error saving product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploadingImage(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Get restaurant slug for upload path
      const response = await fetch('/api/admin/me/restaurant', {
        headers: {
          'x-user-id': user?.id || ''
        }
      });
      
      if (!response.ok) {
        showError('Failed to get restaurant information');
        return;
      }
      
      const restaurantData = await response.json();
      const restaurantSlug = restaurantData.restaurant?.slug || 'default';
      
      const uploadResponse = await fetch(`/api/upload/productImage/${restaurantSlug}`, {
        method: 'POST',
        body: formData
      });
      
      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        setImagePreview(result.url);
        showSuccess('Image uploaded successfully');
      } else {
        const error = await uploadResponse.json();
        showError(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('Error uploading image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingProduct ? 'Edit Product' : 'Add New Product'}
      description="Manage product details, ingredients, and nutritional information"
      size="xl"
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <ModalBody>
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter product name"
                required
                className="text-high-contrast"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                required
                className="text-high-contrast"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">AI Language Override</Label>
              <Select
                value={formData.manual_language_override}
                onValueChange={(value: '' | 'ro' | 'en') => setFormData({ ...formData, manual_language_override: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Auto-detect language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Auto-detect language</SelectItem>
                  <SelectItem value="ro">Romanian (ro)</SelectItem>
                  <SelectItem value="en">English (en)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-low-contrast">
                Force AI to generate content in a specific language
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter product description"
              rows={4}
              className="text-high-contrast"
            />
          </div>

          {/* AI-Generated Fields */}
          {(formData.generated_description || formData.recipe.length > 0 || formData.allergens.length > 0) && (
            <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                AI-Generated Content
              </h3>
              
              {/* Generated Description */}
              {formData.generated_description && (
                <div className="space-y-2">
                  <Label htmlFor="generated-description">AI-Generated Description</Label>
                  <Textarea
                    id="generated-description"
                    value={formData.generated_description}
                    onChange={(e) => setFormData({ ...formData, generated_description: e.target.value })}
                    placeholder="AI-generated description"
                    rows={3}
                    className="text-high-contrast"
                  />
                </div>
              )}

              {/* Recipe Ingredients */}
              <AddIngredients
                ingredients={formData.recipe}
                onIngredientsChange={(recipe) => setFormData({ ...formData, recipe })}
                onNormalizeIngredients={handleNormalizeIngredients}
                isNormalizing={isNormalizingIngredients}
              />

              {/* Allergens */}
              {formData.allergens.length > 0 && (
                <div className="space-y-2">
                  <Label>Allergens</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.allergens.map((allergen, index) => (
                      <div key={index} className="flex items-center gap-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 px-2 py-1 rounded-full text-sm">
                        <span>{allergen}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newAllergens = formData.allergens.filter((_, i) => i !== index);
                            setFormData({ ...formData, allergens: newAllergens });
                          }}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product Attributes */}
          <div className="space-y-4">
            <Label>Product Attributes</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Frozen Toggle */}
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_frozen}
                  onChange={(e) => setFormData({ ...formData, is_frozen: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex items-center gap-2">
                  <Snowflake className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-high-contrast">Comes from frozen product</span>
                </div>
              </label>

              {/* Vegetarian Toggle */}
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_vegetarian}
                  onChange={(e) => setFormData({ ...formData, is_vegetarian: e.target.checked })}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <div className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-high-contrast">Is vegetarian</span>
                </div>
              </label>

              {/* Spicy Toggle */}
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_spicy}
                  onChange={(e) => setFormData({ ...formData, is_spicy: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500" />
                  <span className="text-sm font-medium text-high-contrast">Is spicy</span>
                </div>
              </label>
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Product Image</Label>
            {imagePreview ? (
              <div className="relative">
                <div
                  style={{
                    backgroundImage: `url(${imagePreview})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                  className="w-full h-32 rounded-lg border-2 border-gray-200 dark:border-gray-700"
                  role="img"
                  aria-label="Product preview"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="absolute inset-0 bg-black bg-opacity-50 text-white rounded-lg flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                >
                  {isUploadingImage ? 'Uploading...' : 'Change Image'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploadingImage}
                className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500 transition-colors"
              >
                {isUploadingImage ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-sm">Click to upload image</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
              }}
              className="hidden"
            />
          </div>

          {/* Nutrition Information */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-lg font-semibold text-high-contrast mb-4">
              Nutrition Information (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="calories">Calories (kcal)</Label>
                <Input
                  id="calories"
                  type="number"
                  value={formData.nutrition.calories}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutrition: { ...formData.nutrition, calories: e.target.value }
                  })}
                  placeholder="Calories"
                  className="text-high-contrast"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="text"
                  value={formData.nutrition.protein}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutrition: { ...formData.nutrition, protein: e.target.value }
                  })}
                  placeholder="Protein"
                  className="text-high-contrast"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="text"
                  value={formData.nutrition.carbs}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutrition: { ...formData.nutrition, carbs: e.target.value }
                  })}
                  placeholder="Carbs"
                  className="text-high-contrast"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fat">Fat (g)</Label>
                <Input
                  id="fat"
                  type="text"
                  value={formData.nutrition.fat}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutrition: { ...formData.nutrition, fat: e.target.value }
                  })}
                  placeholder="Fat"
                  className="text-high-contrast"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sugars">Sugars (g)</Label>
                <Input
                  id="sugars"
                  type="text"
                  value={formData.nutrition.sugars}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutrition: { ...formData.nutrition, sugars: e.target.value }
                  })}
                  placeholder="Sugars"
                  className="text-high-contrast"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salts">Salts (g)</Label>
                <Input
                  id="salts"
                  type="text"
                  value={formData.nutrition.salts}
                  onChange={(e) => setFormData({
                    ...formData,
                    nutrition: { ...formData.nutrition, salts: e.target.value }
                  })}
                  placeholder="Salts"
                  className="text-high-contrast"
                />
              </div>
            </div>
          </div>
        </ModalBody>
        
        <ModalFooter>
          <Button
            type="submit"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            {editingProduct ? 'Update Product' : 'Create Product'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
