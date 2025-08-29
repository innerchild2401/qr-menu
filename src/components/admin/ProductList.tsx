'use client';

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
}

interface ProductListProps {
  products: Product[];
  viewMode: 'table' | 'cards';
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onAddNew: () => void;
}

export default function ProductList({ 
  products, 
  viewMode, 
  onEdit, 
  onDelete, 
  onAddNew 
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
        const data = await response.json();
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
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          No products found. Create your first product to get started.
        </p>
        <button
          onClick={onAddNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
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
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Image</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Category</th>
              <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Price</th>
              <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700">
                <td className="py-3 px-4">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                    {product.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                        {product.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                  {product.categories?.name || 'No category'}
                </td>
                <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                  ${product.price.toFixed(2)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => onEdit(product)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product)}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
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

  // Card view - matching restaurant menu page design
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <div
          key={product.id}
          className="overflow-hidden hover:shadow-lg transition-all duration-300 h-48 flex flex-col border border-gray-200 dark:border-gray-600 rounded-lg"
        >
          {/* Header with name and price - at the top */}
          <div className="p-4 pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-lg line-clamp-1">
                  {product.name}
                </h3>
              </div>
              <div className="ml-4 flex-shrink-0">
                <div className="text-lg font-bold text-primary">
                  ${product.price.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section: Image + Description */}
          <div className="px-4 pb-2">
            {product.image_url ? (
              /* Layout with image */
              <div className="flex gap-3">
                {/* Image Square - Left Column */}
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-muted">
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Gradient overlay for smooth transition to text */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-white dark:to-background opacity-80" />
                  </div>
                </div>
                
                {/* Description - Right Column */}
                <div className="flex-1 min-w-0">
                  <div className="text-muted-foreground text-sm">
                    {product.description ? (
                      product.description.length > 60 ? 
                        `${product.description.slice(0, 60)}...` : 
                        product.description
                    ) : (
                      <span className="text-gray-400 italic">No description</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Layout without image - full width description */
              <div className="text-muted-foreground text-sm">
                {product.description ? (
                  product.description.length > 60 ? 
                    `${product.description.slice(0, 60)}...` : 
                    product.description
                ) : (
                  <span className="text-gray-400 italic">No description</span>
                )}
              </div>
            )}
          </div>

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
                <button
                  onClick={() => onEdit(product)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(product)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
