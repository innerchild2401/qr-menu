'use client';

import { useState, useRef, useEffect } from 'react';
import { authenticatedApiCallWithBody } from '../../../lib/api-helpers';
import { generateDescription } from '../../lib/ai/generateDescription';

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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 mb-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {editingProduct ? 'Edit Product' : 'Add New Product'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
              placeholder="Enter product name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Price *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
              placeholder="0.00"
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Category
          </label>
          <select
            value={formData.category_id}
            onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
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
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
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

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Product Image
          </label>
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Product preview"
                className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
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
              className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
            >
              {isUploadingImage ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
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
        <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-6 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Nutrition Information (Optional)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Calories (kcal)
              </label>
              <input
                type="number"
                value={formData.nutrition.calories}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, calories: e.target.value }
                })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Calories"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Protein (g)
              </label>
              <input
                type="text"
                value={formData.nutrition.protein}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, protein: e.target.value }
                })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Protein"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Carbs (g)
              </label>
              <input
                type="text"
                value={formData.nutrition.carbs}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, carbs: e.target.value }
                })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Carbs"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Fat (g)
              </label>
              <input
                type="text"
                value={formData.nutrition.fat}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, fat: e.target.value }
                })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Fat"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Sugars (g)
              </label>
              <input
                type="text"
                value={formData.nutrition.sugars}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, sugars: e.target.value }
                })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Sugars"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Salts (g)
              </label>
              <input
                type="text"
                value={formData.nutrition.salts}
                onChange={(e) => setFormData({
                  ...formData,
                  nutrition: { ...formData.nutrition, salts: e.target.value }
                })}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Salts"
              />
            </div>
          </div>
        </div>
        
        <div className="flex space-x-4 pt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Saving...
              </>
            ) : (
              editingProduct ? 'Update Product' : 'Create Product'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
