'use client';

import { useState, useRef, useEffect } from 'react';
import { authenticatedApiCallWithBody } from '../../../lib/api-helpers';
import { generateDescription } from '../../lib/ai/generateDescription';
import { typography, spacing } from '@/lib/design-system';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Snowflake, Leaf, Flame } from 'lucide-react';

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
  nutrition: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    sugars: string;
    salts: string;
  };
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

export default function ProductForm({ 
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
  const [aiDescription, setAiDescription] = useState<string>('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    category_id: '',
    is_frozen: false,
    is_vegetarian: false,
    is_spicy: false,
    nutrition: {
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      sugars: '',
      salts: ''
    }
  });

  const imageInputRef = useRef<HTMLInputElement>(null);

  // Handle name change
  const handleNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
  };

  // Generate AI description when product name changes (with debouncing)
  useEffect(() => {
    const name = formData.name;
    
    // Clear AI description if name is empty
    if (!name.trim()) {
      setAiDescription('');
      return;
    }
    
    // Generate AI description if name is not empty, description is empty, and not editing
    if (name.trim() && !formData.description.trim() && !editingProduct) {
      const timeoutId = setTimeout(async () => {
        setIsGeneratingAI(true);
        try {
          const aiDesc = await generateDescription(name);
          // Only set if the name hasn't changed during generation
          if (formData.name === name) {
            setAiDescription(aiDesc);
          }
        } catch (error) {
          console.error('Error generating AI description:', error);
        } finally {
          setIsGeneratingAI(false);
        }
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timeoutId);
    }
  }, [formData.name, formData.description, editingProduct]);

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
        nutrition: {
          calories: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'calories' in editingProduct.nutrition ? String(editingProduct.nutrition.calories) : '',
          protein: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'protein' in editingProduct.nutrition ? String(editingProduct.nutrition.protein) : '',
          carbs: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'carbs' in editingProduct.nutrition ? String(editingProduct.nutrition.carbs) : '',
          fat: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'fat' in editingProduct.nutrition ? String(editingProduct.nutrition.fat) : '',
          sugars: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'sugars' in editingProduct.nutrition ? String(editingProduct.nutrition.sugars) : '',
          salts: editingProduct.nutrition && typeof editingProduct.nutrition === 'object' && 'salts' in editingProduct.nutrition ? String(editingProduct.nutrition.salts) : ''
        }
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
      nutrition: {
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        sugars: '',
        salts: ''
      }
    });
    setImagePreview('');
    setAiDescription('');
    setIsGeneratingAI(false);
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
        nutrition: formData.nutrition.calories || formData.nutrition.protein || formData.nutrition.carbs || formData.nutrition.fat || formData.nutrition.sugars || formData.nutrition.salts ? {
          calories: formData.nutrition.calories ? parseInt(formData.nutrition.calories) : null,
          protein: formData.nutrition.protein || null,
          carbs: formData.nutrition.carbs || null,
          fat: formData.nutrition.fat || null,
          sugars: formData.nutrition.sugars || null,
          salts: formData.nutrition.salts || null
        } : null
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

  if (!isOpen) return null;

  return (
    <Card className={`${spacing.lg} mb-6`}>
      <h2 className={`${typography.h3} mb-6`}>
        {editingProduct ? 'Edit Product' : 'Add New Product'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              placeholder="Enter product name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Price *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              placeholder="0.00"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Category
          </label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
          >
            <option value="">Select a category (optional)</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
            placeholder="Enter product description"
            rows={4}
          />
          
          {/* AI Description Suggestion */}
          {aiDescription && !editingProduct && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">AI Suggested</span>
                  {isGeneratingAI && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, description: aiDescription })}
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Use AI Suggestion
                </button>
              </div>
              <p className="text-sm italic text-blue-700 dark:text-blue-300">{aiDescription}</p>
            </div>
          )}
        </div>

        {/* Product Flags */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Product Attributes
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Frozen Toggle */}
            <label className="flex items-center gap-2 rounded-md border p-3 hover:bg-muted/50 transition cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_frozen}
                onChange={(e) => setFormData({ ...formData, is_frozen: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <Snowflake className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Comes from frozen product</span>
              </div>
            </label>

            {/* Vegetarian Toggle */}
            <label className="flex items-center gap-2 rounded-md border p-3 hover:bg-muted/50 transition cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_vegetarian}
                onChange={(e) => setFormData({ ...formData, is_vegetarian: e.target.checked })}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Is vegetarian</span>
              </div>
            </label>

            {/* Spicy Toggle */}
            <label className="flex items-center gap-2 rounded-md border p-3 hover:bg-muted/50 transition cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_spicy}
                onChange={(e) => setFormData({ ...formData, is_spicy: e.target.checked })}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium">Is spicy</span>
              </div>
            </label>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Product Image
          </label>
          {imagePreview ? (
            <div className="relative">
              <div
                style={{
                  backgroundImage: `url(${imagePreview})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
                className="w-full h-32 rounded-lg border-2 border-border"
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
                className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
              >
                              {isUploadingImage ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-muted-foreground"></div>
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
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
        <div className="border border-border rounded-lg p-6 bg-muted/30">
          <h3 className={`${typography.h4} mb-4`}>
            Nutrition Information (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Calories (kcal)
              </label>
              <input
                type="number"
                value={formData.nutrition.calories}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, calories: e.target.value }
                })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                placeholder="Calories"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Protein (g)
              </label>
              <input
                type="text"
                value={formData.nutrition.protein}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, protein: e.target.value }
                })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                placeholder="Protein"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Carbs (g)
              </label>
              <input
                type="text"
                value={formData.nutrition.carbs}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, carbs: e.target.value }
                })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                placeholder="Carbs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Fat (g)
              </label>
              <input
                type="text"
                value={formData.nutrition.fat}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, fat: e.target.value }
                })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                placeholder="Fat"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Sugars (g)
              </label>
              <input
                type="text"
                value={formData.nutrition.sugars}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, sugars: e.target.value }
                })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                placeholder="Sugars"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Salts (g)
              </label>
              <input
                type="text"
                value={formData.nutrition.salts}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, salts: e.target.value }
                })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                placeholder="Salts"
              />
            </div>
          </div>
        </div>
        
        <div className="flex space-x-4 pt-6">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              editingProduct ? 'Update Product' : 'Create Product'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
