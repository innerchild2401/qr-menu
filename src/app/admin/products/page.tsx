'use client';

import { supabase } from '@/lib/auth-supabase';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/Toast';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  nutrition: {
    calories: number;
    protein: string;
    carbs: string;
    fat: string;
  };
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  order: number;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  nutrition: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
  };
}

export default function AdminProducts() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  
  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    nutrition: {
      calories: '',
      protein: '',
      carbs: '',
      fat: ''
    }
  });

  // File input ref
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load user session
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load products and categories in parallel
      const [productsResponse, categoriesResponse] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/categories')
      ]);

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData.products || []);
      }

      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);
      }
    } catch {
      showError('Error loading data');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      nutrition: {
        calories: '',
        protein: '',
        carbs: '',
        fat: ''
      }
    });
    setImagePreview('');
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return '';

    try {
      setIsUploadingImage(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`/api/upload/productImage/test-slug`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setImagePreview(result.url);
        showSuccess('Image uploaded successfully');
        return result.url;
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to upload image');
        return '';
      }
    } catch {
      showError('Error uploading image');
      return '';
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showError('Product name is required');
      return;
    }

    if (!formData.description.trim()) {
      showError('Product description is required');
      return;
    }

    if (!formData.price || isNaN(parseFloat(formData.price))) {
      showError('Valid price is required');
      return;
    }

    if (!formData.categoryId) {
      showError('Category is required');
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare nutrition data
      const nutrition = {
        calories: parseInt(formData.nutrition.calories) || 0,
        protein: formData.nutrition.protein || '0g',
        carbs: formData.nutrition.carbs || '0g',
        fat: formData.nutrition.fat || '0g'
      };

      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image: imagePreview || (editingProduct?.image || ''),
        nutrition,
        categoryId: formData.categoryId
      };

      const url = editingProduct 
        ? `/api/admin/products/${editingProduct.id}`
        : '/api/admin/products';
      
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message);
        resetForm();
        loadData(); // Reload products
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to save product');
      }
    } catch {
      showError('Error saving product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      categoryId: product.categoryId,
      nutrition: {
        calories: product.nutrition.calories.toString(),
        protein: product.nutrition.protein,
        carbs: product.nutrition.carbs,
        fat: product.nutrition.fat
      }
    });
    setImagePreview(product.image);
    setShowForm(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message);
        loadData(); // Reload products
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to delete product');
      }
    } catch {
      showError('Error deleting product');
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Product Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your menu products and their details
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Product
        </button>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">View:</span>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'cards' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'table' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingProduct ? 'Edit Product' : 'Add New Product'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter product name"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter product description"
                    rows={3}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image and Nutrition */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Image
                  </label>
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-40 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-600"
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
                      className="w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
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
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) await handleImageUpload(file);
                    }}
                    className="hidden"
                  />
                </div>

                {/* Nutrition Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nutrition Information
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="number"
                        value={formData.nutrition.calories}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          nutrition: { ...formData.nutrition, calories: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Calories"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.nutrition.protein}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          nutrition: { ...formData.nutrition, protein: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Protein (e.g., 25g)"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.nutrition.carbs}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          nutrition: { ...formData.nutrition, carbs: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Carbs (e.g., 30g)"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.nutrition.fat}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          nutrition: { ...formData.nutrition, fat: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="Fat (e.g., 15g)"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingProduct ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingProduct ? 'Update Product' : 'Create Product'
                )}
              </button>
              
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products Display */}
      {products.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No products found. Create your first product to get started.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Add First Product
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Product Image */}
              <div className="relative h-48">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-blue-600 text-white px-2 py-1 rounded-lg text-sm font-bold">
                  ${product.price.toFixed(2)}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {product.name}
                  </h3>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                  {product.description}
                </p>

                <div className="mb-3">
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs">
                    {getCategoryName(product.categoryId)}
                  </span>
                </div>

                {/* Nutrition Info */}
                <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Nutrition:</p>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{product.nutrition.calories} cal</span>
                    <span>P: {product.nutrition.protein}</span>
                    <span>C: {product.nutrition.carbs}</span>
                    <span>F: {product.nutrition.fat}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    className="flex-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Product</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Price</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Nutrition</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded-lg mr-3"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg mr-3 flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{product.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                      {getCategoryName(product.categoryId)}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                      ${product.price.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                      {product.nutrition.calories} cal
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="text-red-600 hover:text-red-700 text-sm"
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
        </div>
      )}

      {/* Statistics */}
      {products.length > 0 && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Product Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Products:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{products.length}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">With Images:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {products.filter(prod => prod.image).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Avg Price:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                ${(products.reduce((sum, prod) => sum + prod.price, 0) / products.length).toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Categories:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {new Set(products.map(prod => prod.categoryId)).size}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
