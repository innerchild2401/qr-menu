'use client';

import { authenticatedApiCall } from '@/lib/api-helpers';
import { useState, useEffect, useCallback } from 'react';
import { typography, spacing } from '@/lib/design-system';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BulkUploadModal from '../../../components/admin/BulkUploadModal';
import ProductForm from '../../../components/admin/ProductForm';
import ProductList from '../../../components/admin/ProductList';
import NoRestaurantMessage from '../../../components/admin/NoRestaurantMessage';

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

export default function AdminProducts() {
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
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
        setProducts([]);
        return;
      } else {
        console.error('Failed to load restaurant data');
        setHasRestaurant(false);
        return;
      }

      // Load categories
      const categoriesResponse = await authenticatedApiCall('/api/admin/categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);
      } else {
        console.error('Failed to load categories');
      }

      // Load products
      const productsResponse = await authenticatedApiCall('/api/admin/products');
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData.products || []);
      } else {
        console.error('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setHasRestaurant(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddNew = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDelete = async (product: Product) => {
    try {
      const response = await authenticatedApiCall(`/api/admin/products/${product.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
        loadData(); // Reload data
      } else {
        const errorData = await response.json();
        console.error(errorData.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingProduct(null);
    loadData();
  };

  const handleBulkUploadSuccess = () => {
    loadData();
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
        
        <div className="mb-8">
          <h1 className={`${typography.h2} mb-2`}>
            Product Management
          </h1>
          <p className={typography.bodySmall}>
            Manage your menu products and their details
          </p>
        </div>

        <NoRestaurantMessage />
      </div>
    );
  }

  return (
    <div>
      
      <div className="mb-8">
        <h1 className={`${typography.h2} mb-2`}>
          Product Management
        </h1>
        <p className={typography.bodySmall}>
          Manage your menu products and their details
        </p>
      </div>

      {/* Add Product Buttons */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-3">
        <Button onClick={handleAddNew} className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Product
        </Button>
          
          <Button 
            onClick={() => setShowBulkUploadModal(true)}
            variant="outline"
            className="flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Bulk Upload Menu
          </Button>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={() => setViewMode('cards')}
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
          >
            Cards
          </Button>
          <Button
            onClick={() => setViewMode('table')}
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
          >
            Table
          </Button>
        </div>
      </div>

      {/* Product Form */}
      <ProductForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleFormSuccess}
        showSuccess={(msg) => console.log(msg)}
        showError={(msg) => console.error(msg)}
        categories={categories}
        editingProduct={editingProduct}
        user={null}
      />

      {/* Products List */}
      <Card className={spacing.md}>
        <h2 className={`${typography.h4} mb-4`}>
          Products ({products.length})
        </h2>
        
        <ProductList
          products={products}
          viewMode={viewMode}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddNew={handleAddNew}
        />
      </Card>
                
      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSuccess={handleBulkUploadSuccess}
        showSuccess={(msg) => console.log(msg)}
        showError={(msg) => console.error(msg)}
        user={null}
      />
    </div>
  );
}
