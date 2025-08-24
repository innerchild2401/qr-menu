'use client';

import { supabase } from '@/lib/auth-supabase';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/Toast';

interface Category {
  id: string;
  name: string;
  description: string;
  order: number;
}

interface CategoryFormData {
  name: string;
  description: string;
}

export default function AdminCategories() {
  const { toasts, removeToast, showSuccess, showError } = useToast();
  
  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '', description: '' });
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/categories');
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        showError('Failed to load categories');
      }
    } catch {
      showError('Error loading categories');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Load categories on mount
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        loadCategories();
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadCategories();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadCategories]);

  const resetForm = () => {
    setFormData({ name: '', description: '' });
    setShowAddForm(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showError('Category name is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message);
        resetForm();
        loadCategories(); // Reload categories
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to save category');
      }
    } catch {
      showError('Error saving category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description
    });
    setShowAddForm(true);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message);
        loadCategories(); // Reload categories
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to delete category');
      }
    } catch {
      showError('Error deleting category');
    }
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
          Category Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your menu categories and their organization
        </p>
      </div>

      {/* Add Category Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Category
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter category name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter category description (optional)"
                rows={3}
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingCategory ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingCategory ? 'Update Category' : 'Create Category'
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

      {/* Categories List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Current Categories ({categories.length})
        </h2>
        
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No categories found. Create your first category to get started.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Add First Category
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
                        {category.name}
                      </h3>
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full text-xs">
                        Order: {category.order}
                      </span>
                    </div>
                    
                    {category.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        {category.description}
                      </p>
                    )}
                    
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      ID: {category.id}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(category)}
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 px-3 py-1 rounded-md text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Statistics */}
      {categories.length > 0 && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Category Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Categories:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{categories.length}</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">With Descriptions:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {categories.filter(cat => cat.description).length}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Next Order:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {categories.length > 0 ? Math.max(...categories.map(cat => cat.order)) + 1 : 1}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
