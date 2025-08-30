'use client';

import { authenticatedApiCall, authenticatedApiCallWithBody } from '@/lib/api-helpers';
import { useState, useEffect, useCallback } from 'react';
import { typography, spacing } from '@/lib/design-system';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Category {
  id: string;
  name: string;
  restaurant_id: string;
  created_at: string;
}

interface CategoryFormData {
  name: string;
}

export default function AdminCategories() {
  
  // State management
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ name: '' });

  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // First, check if user has a restaurant
      const restaurantResponse = await authenticatedApiCall('/api/admin/me/restaurant');
      if (restaurantResponse.ok) {
        setHasRestaurant(true);
      } else if (restaurantResponse.status === 404) {
        // No restaurant found
        setHasRestaurant(false);
        setCategories([]);
        return;
      } else {
        console.error('Failed to load restaurant data');
        setHasRestaurant(false);
        return;
      }

      // Then load categories
      const categoriesResponse = await authenticatedApiCall('/api/admin/categories');
      if (categoriesResponse.ok) {
        const data = await categoriesResponse.json();
        setCategories(data.categories || []);
      } else {
        console.error('Failed to load categories');
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      setHasRestaurant(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const resetForm = () => {
    setFormData({ name: '' });
    setShowAddForm(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      console.error('Category name is required');
      return;
    }

    try {
      setIsSubmitting(true);

      const url = editingCategory 
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await authenticatedApiCallWithBody(url, formData, {
        method,
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
        resetForm();
        loadCategories(); // Reload categories
      } else {
        const errorData = await response.json();
        console.error(errorData.error || 'Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name
    });
    setShowAddForm(true);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await authenticatedApiCall(`/api/admin/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
        loadCategories(); // Reload categories
      } else {
        const errorData = await response.json();
        console.error(errorData.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  if (isLoading) {
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
            Category Management
          </h1>
          <p className={typography.bodySmall}>
            Manage your menu categories and their organization
          </p>
        </div>

        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-muted-foreground mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className={`${typography.h4} mb-2`}>
              No Restaurant Found
            </h2>
            <p className={`${typography.bodySmall} mb-6`}>
              You need to create a restaurant first before you can manage categories.
            </p>
            <Button onClick={() => window.location.href = '/admin/settings'}>
              Go to Settings
            </Button>
          </div>
        </div>
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
              Category Management
            </h1>
            <p className={`${typography.bodySmall} break-words`}>
              Manage your menu categories
            </p>
          </div>
        </div>
      </div>

      {/* Add Category Button */}
      <div className="mb-6">
        <Button onClick={() => setShowAddForm(true)} className="flex items-center w-full sm:w-auto min-h-[44px]">
          <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="whitespace-nowrap">Add New Category</span>
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className={`${spacing.md} mb-6`}>
          <h2 className={`${typography.h4} mb-4 break-words`}>
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Category Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground min-h-[44px]"
                placeholder="Enter category name"
                required
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center min-h-[44px] w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  editingCategory ? 'Update Category' : 'Create Category'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={isSubmitting}
                className="min-h-[44px] w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Categories List */}
      <Card className={spacing.md}>
        <h2 className={`${typography.h4} mb-4 break-words`}>
          Categories ({categories.length})
        </h2>
        
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-muted-foreground mb-4 break-words">
              No categories found. Create your first category to get started.
            </p>
            <Button onClick={() => setShowAddForm(true)} className="min-h-[44px]">
              Add First Category
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 sm:px-4 font-medium text-foreground text-sm">Name</th>
                  <th className="text-left py-3 px-2 sm:px-4 font-medium text-foreground text-sm">Created</th>
                  <th className="text-right py-3 px-2 sm:px-4 font-medium text-foreground text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-2 sm:px-4 text-foreground font-medium break-words">
                      {category.name}
                    </td>
                    <td className="py-3 px-2 sm:px-4 text-muted-foreground text-sm">
                      {new Date(category.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-2 sm:px-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="text-primary hover:text-primary/80 text-sm font-medium min-h-[44px] min-w-[44px] px-3 py-2 rounded hover:bg-primary/10 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          className="text-destructive hover:text-destructive/80 text-sm font-medium min-h-[44px] min-w-[44px] px-3 py-2 rounded hover:bg-destructive/10 transition-colors"
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
        )}
      </Card>
    </div>
  );
}
