'use client';

import { supabase } from '@/lib/auth-supabase';
import { authenticatedApiCall, authenticatedApiCallWithBody } from '@/lib/api-helpers';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/Toast';
import * as XLSX from 'exceljs';
import { 
  detectColumnsWithDetails, 
  parseRowData, 
  validateParsedRow, 
  getSkippedColumns,
  columnSynonyms,
  type ColumnMapping, 
  type ColumnDetectionResult, 
  type ParsedRow 
} from '../../../utils/columnMapper';
import { MenuUploader } from '../../../services/menuUploader';
import { downloadMenuTemplate } from '../../../utils/templateGenerator';

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
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>('');
  const [parsedData, setParsedData] = useState<ColumnDetectionResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [showManualSelection, setShowManualSelection] = useState(false);
  const [manualMapping, setManualMapping] = useState<ColumnMapping>({
    name: null,
    category: null,
    description: null,
    price: null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseProgress, setParseProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<{
    success: number;
    failed: number;
    failedRows: Array<{ row: number; error: string; data: ParsedRow }>;
  } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    category_id: '',
    nutrition: {
      calories: '',
      protein: '',
      carbs: '',
      fat: ''
    }
  });

  // File input refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const bulkUploadInputRef = useRef<HTMLInputElement>(null);

  // Load user session
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        loadData();
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          loadData();
        }
      }
    );

    return () => subscription.unsubscribe();
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
        showError('Failed to load restaurant data');
        setHasRestaurant(false);
        return;
      }

      // Load categories
      const categoriesResponse = await authenticatedApiCall('/api/admin/categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData.categories || []);
      } else {
        showError('Failed to load categories');
      }

      // Load products
      const productsResponse = await authenticatedApiCall('/api/admin/products');
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData.products || []);
      } else {
        showError('Failed to load products');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Error loading data');
      setHasRestaurant(false);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

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
        fat: ''
      }
    });
    setShowForm(false);
    setEditingProduct(null);
    setImagePreview('');
  };

  const handleBulkUploadClick = () => {
    setShowBulkUploadModal(true);
    setSelectedFile(null);
    setFileError('');
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadMenuTemplate();
      showSuccess('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      showError('Failed to download template');
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFileError('');
    setParsedData(null);
    setShowManualSelection(false);
    setManualMapping({
      name: null,
      category: null,
      description: null,
      price: null
    });
    setUploadResults(null);
    setUploadProgress(0);
    setParseProgress(0);
    if (bulkUploadInputRef.current) {
      bulkUploadInputRef.current.value = '';
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError('');
    setParsedData(null);
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv'
    ];
    
    const allowedExtensions = ['.xls', '.xlsx', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setFileError('Please select a valid file (.xls, .xlsx, or .csv)');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    
    // Automatically parse the file
    try {
      setIsParsing(true);
      setParseProgress(0);
      
      // Simulate parsing progress
      const progressInterval = setInterval(() => {
        setParseProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);
      
      const result = await parseFile(file);
      setParseProgress(100);
      clearInterval(progressInterval);
      setParsedData(result);
      
      if (result.missingFields.length > 0) {
        setFileError(`Could not automatically detect columns for: ${result.missingFields.join(', ')}. Please check your file format.`);
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setFileError('Error parsing file. Please check the file format and try again.');
    } finally {
      setIsParsing(false);
      setParseProgress(0);
    }
  };



  const parseFile = async (file: File): Promise<ColumnDetectionResult> => {
    const workbook = new XLSX.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    
    if (file.name.toLowerCase().endsWith('.csv')) {
      // Handle CSV files
      const text = new TextDecoder().decode(arrayBuffer);
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataRows = lines.slice(1, 6); // First 5 data rows
      
      const result = await detectColumnsWithDetails(headers);
      const previewData: ParsedRow[] = [];
      
      dataRows.forEach(row => {
        const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length >= headers.length) {
          previewData.push(parseRowData(values, result.mapping));
        }
      });

      // Convert all data rows to the format needed for manual selection
      const allData: (string | number | null)[][] = dataRows.map(row => 
        row.split(',').map(v => v.trim().replace(/"/g, ''))
      );

      return {
        ...result,
        previewData,
        allData
      };
    } else {
      // Handle Excel files
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];
      
      if (!worksheet) {
        throw new Error('No worksheet found in the Excel file');
      }

      const headers: string[] = [];
      const dataRows: (string | number | null)[][] = [];
      
      // Extract headers and first 5 data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          // Headers
          row.eachCell((cell) => {
            headers.push(String(cell.value ?? ''));
          });
        } else if (rowNumber <= 6) {
          // First 5 data rows
          const rowData: (string | number | null)[] = [];
          row.eachCell((cell) => {
            const value = cell.value;
            if (value === null || value === undefined) {
              rowData.push(null);
            } else if (typeof value === 'string' || typeof value === 'number') {
              rowData.push(value);
            } else {
              rowData.push(String(value));
            }
          });
          dataRows.push(rowData);
        }
      });

      const result = await detectColumnsWithDetails(headers);
      const previewData: ParsedRow[] = [];
      
      dataRows.forEach(row => {
        previewData.push(parseRowData(row, result.mapping));
      });

      // Convert all data rows to the format needed for manual selection
      const allData: (string | number | null)[][] = dataRows.map(row => 
        row.map(cell => cell === null || cell === undefined ? null : String(cell))
      );

      return {
        ...result,
        previewData,
        allData
      };
    }
  };

  const closeBulkUploadModal = () => {
    setShowBulkUploadModal(false);
    setSelectedFile(null);
    setFileError('');
    setParsedData(null);
    setShowManualSelection(false);
    setManualMapping({
      name: null,
      category: null,
      description: null,
      price: null
    });
    setUploadResults(null);
    setUploadProgress(0);
    setParseProgress(0);
    if (bulkUploadInputRef.current) {
      bulkUploadInputRef.current.value = '';
    }
  };

  const handleManualColumnSelect = (field: keyof ColumnMapping, columnIndex: number) => {
    setManualMapping(prev => ({
      ...prev,
      [field]: columnIndex === -1 ? null : columnIndex
    }));
  };

  const handleManualSelectionComplete = () => {
    if (parsedData) {
      // Update the mapping with manual selections
      const updatedMapping = { ...parsedData.mapping, ...manualMapping };
      
      // Create new preview data with manual mapping
      const newPreviewData: ParsedRow[] = [];
      parsedData.allData.forEach(row => {
        newPreviewData.push({
          name: updatedMapping.name !== null ? (String(row[updatedMapping.name] ?? '') || '') : '',
          category: updatedMapping.category !== null ? (String(row[updatedMapping.category] ?? '') || '') : '',
          description: updatedMapping.description !== null ? (String(row[updatedMapping.description] ?? '') || '') : '',
          price: updatedMapping.price !== null ? (parseFloat(String(row[updatedMapping.price] ?? '0')) || 0) : 0
        });
      });

      // Check if all required fields are now mapped
      const newMissingFields = Object.entries(updatedMapping)
        .filter(([_, index]) => index === null)
        .map(([field]) => field);

      setParsedData({
        ...parsedData,
        mapping: updatedMapping,
        previewData: newPreviewData,
        missingFields: newMissingFields
      });

      setShowManualSelection(false);
      setFileError('');
    }
  };

  const handleBulkUpload = async () => {
    if (!parsedData || !user) {
      showError('No data to upload or user not authenticated');
      return;
    }

    setIsUploading(true);
    setUploadResults(null);
    setUploadProgress(0);

    try {
      // Log skipped columns for debugging
      const skippedColumns = getSkippedColumns(parsedData.headers, parsedData.mapping);
      console.log('📊 Bulk Upload Debug Info:', {
        totalColumns: parsedData.headers.length,
        mappedColumns: Object.values(parsedData.mapping).filter(index => index !== null).map(index => parsedData.headers[index]),
        skippedColumns: skippedColumns,
        mapping: parsedData.mapping
      });

      // Get restaurant data first
      const restaurantResponse = await authenticatedApiCall('/api/admin/me/restaurant');
      if (!restaurantResponse.ok) {
        throw new Error('Failed to get restaurant information');
      }
      
      const restaurantData = await restaurantResponse.json();
      const restaurantId = restaurantData.restaurant?.id;
      
      if (!restaurantId) {
        throw new Error('No restaurant found for the current user');
      }

      // Process all data rows with enhanced validation
      const allParsedRows: ParsedRow[] = [];
      const validationErrors: Array<{ row: number; error: string; data: ParsedRow }> = [];

      parsedData.allData.forEach((row, rowIndex) => {
        const parsedRow = parseRowData(row, parsedData.mapping);
        const validation = validateParsedRow(parsedRow);

        if (!validation.isValid) {
          validationErrors.push({
            row: rowIndex + 1,
            error: validation.errors.join(', '),
            data: parsedRow
          });
        } else {
          allParsedRows.push(parsedRow);
        }
      });

      // Filter out rows with missing required data
      const validRows = allParsedRows.filter(row => 
        row.name.trim() && row.price > 0
      );

      if (validRows.length === 0) {
        throw new Error('No valid rows found. Each row must have a product name and price.');
      }

      console.log('📋 Validation Results:', {
        totalRows: parsedData.allData.length,
        validRows: validRows.length,
        validationErrors: validationErrors.length,
        skippedRows: parsedData.allData.length - validRows.length - validationErrors.length
      });

      // Use the MenuUploader service
      const menuUploader = new MenuUploader(restaurantId);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      const uploadResult = await menuUploader.uploadMenu(validRows);
      setUploadProgress(100);
      clearInterval(progressInterval);

      // Combine validation errors with upload failures
      const allFailedRows = [...validationErrors, ...uploadResult.failedRows];

      setUploadResults({
        success: uploadResult.success,
        failed: allFailedRows.length,
        failedRows: allFailedRows
      });

      if (uploadResult.success > 0) {
        showSuccess(`Successfully uploaded ${uploadResult.success} products${allFailedRows.length > 0 ? ` (${allFailedRows.length} failed)` : ''}`);
        loadData(); // Refresh the products list
      }

      console.log('✅ Upload Complete:', {
        successful: uploadResult.success,
        failed: allFailedRows.length,
        validationErrors: validationErrors.length,
        uploadErrors: uploadResult.failedRows.length
      });

    } catch (error) {
      console.error('❌ Bulk upload error:', error);
      showError(error instanceof Error ? error.message : 'Failed to upload products');
      
      setUploadResults({
        success: 0,
        failed: parsedData?.allData.length || 0,
        failedRows: parsedData?.allData.map((row, index) => ({
          row: index + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: parseRowData(row, parsedData.mapping)
        })) || []
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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
        image: imagePreview || null,
        nutrition: formData.nutrition.calories || formData.nutrition.protein || formData.nutrition.carbs || formData.nutrition.fat ? {
          calories: formData.nutrition.calories ? parseInt(formData.nutrition.calories) : null,
          protein: formData.nutrition.protein || null,
          carbs: formData.nutrition.carbs || null,
          fat: formData.nutrition.fat || null
        } : null
      };

      const response = await authenticatedApiCallWithBody(url, submitData, {
        method,
      });

      if (response.ok) {
        const data = await response.json();
        showSuccess(data.message);
        resetForm();
        loadData(); // Reload data
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

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      category_id: product.category_id || '',
      nutrition: {
        calories: product.nutrition && typeof product.nutrition === 'object' && 'calories' in product.nutrition ? String(product.nutrition.calories) : '',
        protein: product.nutrition && typeof product.nutrition === 'object' && 'protein' in product.nutrition ? String(product.nutrition.protein) : '',
        carbs: product.nutrition && typeof product.nutrition === 'object' && 'carbs' in product.nutrition ? String(product.nutrition.carbs) : '',
        fat: product.nutrition && typeof product.nutrition === 'object' && 'fat' in product.nutrition ? String(product.nutrition.fat) : ''
      }
    });
    setImagePreview(product.image_url || '');
    setShowForm(true);
  };

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
        showSuccess(data.message);
        loadData(); // Reload data
      } else {
        const errorData = await response.json();
        showError(errorData.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      showError('Error deleting product');
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploadingImage(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Get restaurant slug for upload path
      const restaurantResponse = await authenticatedApiCall('/api/admin/me/restaurant');
      if (!restaurantResponse.ok) {
        showError('Failed to get restaurant information');
        return;
      }
      
      const restaurantData = await restaurantResponse.json();
      const restaurantSlug = restaurantData.restaurant?.slug || 'default';
      
      const response = await fetch(`/api/upload/productImage/${restaurantSlug}`, {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        const result = await response.json();
        setImagePreview(result.url);
        showSuccess('Image uploaded successfully');
      } else {
        const error = await response.json();
        showError(error.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showError('Error uploading image');
    } finally {
      setIsUploadingImage(false);
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
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Product Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your menu products and their details
          </p>
        </div>

        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Restaurant Found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You need to create a restaurant first before you can manage products.
            </p>
            <button
              onClick={() => window.location.href = '/admin/settings'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Go to Settings
            </button>
          </div>
        </div>
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

      {/* Add Product Buttons */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex space-x-3">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Product
          </button>
          
                     <button
             onClick={handleBulkUploadClick}
             className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
           >
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
             </svg>
             Bulk Upload Menu
           </button>
           
           <button
             onClick={handleDownloadTemplate}
             className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
           >
             <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
             </svg>
             Download Template
           </button>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'cards'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter product description"
                rows={3}
              />
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
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Nutrition Information (Optional)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Calories
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Protein (g)
                  </label>
                  <input
                    type="text"
                    value={formData.nutrition.protein}
                    onChange={(e) => setFormData({
                      ...formData,
                      nutrition: { ...formData.nutrition, protein: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Protein"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Carbs (g)
                  </label>
                  <input
                    type="text"
                    value={formData.nutrition.carbs}
                    onChange={(e) => setFormData({
                      ...formData,
                      nutrition: { ...formData.nutrition, carbs: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Carbs"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fat (g)
                  </label>
                  <input
                    type="text"
                    value={formData.nutrition.fat}
                    onChange={(e) => setFormData({
                      ...formData,
                      nutrition: { ...formData.nutrition, fat: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Fat"
                  />
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
                    Saving...
                  </>
                ) : (
                  editingProduct ? 'Update Product' : 'Create Product'
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={isSubmitting}
                className="bg-gray-300 hover:bg-gray-400 disabled:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Products ({products.length})
        </h2>
        
        {products.length === 0 ? (
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
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add First Product
            </button>
          </div>
        ) : viewMode === 'table' ? (
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
                          onClick={() => handleEdit(product)}
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="aspect-w-16 aspect-h-9 mb-4">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {product.name}
                  </h3>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
                
                {product.description && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                    {product.description}
                  </p>
                )}
                
                {product.categories?.name && (
                  <div className="mb-3">
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full text-xs">
                      {product.categories.name}
                    </span>
                  </div>
                )}
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Hidden file input for bulk upload */}
        <input
          ref={bulkUploadInputRef}
          type="file"
          accept=".xls,.xlsx,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Bulk Upload Menu
                </h2>
                <button
                  onClick={closeBulkUploadModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

                             <div className="mb-6">
                 <p className="text-gray-600 dark:text-gray-400 mb-4">
                   Upload a spreadsheet (.xls, .xlsx) or CSV file to bulk import your menu items.
                 </p>
                 
                                   <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                    {selectedFile ? (
                      <div className="space-y-2">
                        <svg className="w-12 h-12 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                        {isParsing && (
                          <div className="mt-3">
                            <div className="flex items-center justify-center mb-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                              <span className="text-xs text-gray-500">Parsing file...</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${parseProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{parseProgress}%</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to select a file or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Supports .xls, .xlsx, .csv files
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-4 flex space-x-2 justify-center">
                      <button
                        onClick={() => bulkUploadInputRef.current?.click()}
                        disabled={isParsing}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        {selectedFile ? 'Change File' : 'Select File'}
                      </button>
                      {selectedFile && (
                        <button
                          onClick={handleClearFile}
                          disabled={isParsing || isUploading}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          Clear File
                        </button>
                      )}
                    </div>
                  </div>

                 {fileError && (
                   <p className="text-red-600 dark:text-red-400 text-sm mt-2">
                     {fileError}
                   </p>
                 )}

                                   {/* Column Detection Results */}
                  {parsedData && (
                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                        Column Detection Results
                        <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          parsedData.detectionMethod === 'synonym' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : parsedData.detectionMethod === 'ai'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                            : parsedData.detectionMethod === 'hybrid'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {parsedData.detectionMethod === 'synonym' && (
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                          {parsedData.detectionMethod === 'ai' && (
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          )}
                          {parsedData.detectionMethod === 'hybrid' && (
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          )}
                          {parsedData.detectionMethod === 'manual' && (
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          )}
                          {parsedData.detectionMethod === 'synonym' ? 'Fast Synonyms' :
                           parsedData.detectionMethod === 'ai' ? 'AI Semantic' :
                           parsedData.detectionMethod === 'hybrid' ? 'Hybrid (Synonyms + AI)' :
                           'Manual Selection'}
                        </span>
                      </h3>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Detected Columns:
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Product Name:</span>
                            <span className="font-medium">
                              {parsedData.mapping.name !== null 
                                ? parsedData.headers[parsedData.mapping.name] 
                                : 'Not detected'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Category:</span>
                            <span className="font-medium">
                              {parsedData.mapping.category !== null 
                                ? parsedData.headers[parsedData.mapping.category] 
                                : 'Not detected'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Description:</span>
                            <span className="font-medium">
                              {parsedData.mapping.description !== null 
                                ? parsedData.headers[parsedData.mapping.description] 
                                : 'Not detected'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Price:</span>
                            <span className="font-medium">
                              {parsedData.mapping.price !== null 
                                ? parsedData.headers[parsedData.mapping.price] 
                                : 'Not detected'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {parsedData.detectionMethod === 'synonym' && '⚡ Fast synonym-based detection'}
                            {parsedData.detectionMethod === 'ai' && '🤖 AI semantic matching'}
                            {parsedData.detectionMethod === 'hybrid' && '⚡ Fast synonyms + 🤖 AI semantic matching for unmatched fields'}
                            {parsedData.detectionMethod === 'manual' && '✏️ Manual column selection'}
                          </p>
                          {parsedData.synonymMatches && parsedData.aiMatches && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              💡 Irrelevant columns (id, sku, stock, etc.) are automatically ignored
                            </p>
                          )}
                        </div>
                      </div>

                     {/* Preview Table */}
                     {parsedData.previewData.length > 0 && (
                       <div className="mt-4">
                         <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                           Preview (First 5 rows):
                         </h4>
                         <div className="overflow-x-auto">
                           <table className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg">
                             <thead>
                               <tr className="bg-gray-50 dark:bg-gray-700">
                                 <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600">
                                   Product Name
                                 </th>
                                 <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600">
                                   Category
                                 </th>
                                 <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600">
                                   Description
                                 </th>
                                 <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-600">
                                   Price
                                 </th>
                               </tr>
                             </thead>
                             <tbody>
                               {parsedData.previewData.map((row, index) => (
                                 <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                                   <td className="px-3 py-2 text-gray-900 dark:text-white">
                                     {row.name || '-'}
                                   </td>
                                   <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                     {row.category || '-'}
                                   </td>
                                   <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                                     {row.description || '-'}
                                   </td>
                                   <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">
                                     {row.price > 0 ? `$${row.price.toFixed(2)}` : '-'}
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>
                     )}

                     {/* Manual Column Selection */}
                     {parsedData && parsedData.missingFields.length > 0 && !showManualSelection && (
                       <div className="mt-4">
                         <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                           <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                             Manual Column Selection Required
                           </h4>
                           <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                             Could not automatically detect columns for: {parsedData.missingFields.join(', ')}. 
                             Please manually select the correct columns.
                           </p>
                           <button
                             onClick={() => setShowManualSelection(true)}
                             className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                           >
                             Select Columns Manually
                           </button>
                         </div>
                       </div>
                     )}

                     {/* Manual Selection Interface */}
                     {showManualSelection && parsedData && (
                       <div className="mt-6">
                         <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                           Manual Column Selection
                         </h4>
                         <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                           Select which column contains each required field:
                         </p>
                         
                         <div className="space-y-4">
                           {Object.entries(columnSynonyms).map(([field, synonyms]) => (
                             <div key={field} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                               <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                                 {field === 'name' ? 'Product Name' : 
                                  field === 'category' ? 'Category' : 
                                  field === 'description' ? 'Description' : 'Price'}
                               </label>
                               <select
                                 value={manualMapping[field as keyof ColumnMapping]?.toString() ?? ''}
                                 onChange={(e) => handleManualColumnSelect(
                                   field as keyof ColumnMapping, 
                                   e.target.value ? parseInt(e.target.value) : -1
                                 )}
                                 className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-600 dark:text-white text-sm"
                               >
                                 <option value="">Select a column...</option>
                                 {parsedData.headers.map((header, index) => (
                                   <option key={index} value={index}>
                                     {header} (Column {index + 1})
                                   </option>
                                 ))}
                               </select>
                             </div>
                           ))}
                         </div>

                         <div className="mt-4">
                           <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                             All Columns Preview (First 5 rows):
                           </h5>
                           <div className="overflow-x-auto">
                             <table className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg">
                               <thead>
                                 <tr className="bg-gray-50 dark:bg-gray-700">
                                   {parsedData.headers.map((header, index) => (
                                     <th key={index} className="px-2 py-1 text-left border-b border-gray-200 dark:border-gray-600">
                                       {header}
                                     </th>
                                   ))}
                                 </tr>
                               </thead>
                               <tbody>
                                 {parsedData.allData.slice(0, 5).map((row, rowIndex) => (
                                   <tr key={rowIndex} className="border-b border-gray-100 dark:border-gray-700">
                                     {row.map((cell, cellIndex) => (
                                       <td key={cellIndex} className="px-2 py-1 text-gray-900 dark:text-white">
                                         {cell || '-'}
                                       </td>
                                     ))}
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>
                         </div>

                         <div className="mt-4 flex justify-end space-x-3">
                           <button
                             onClick={() => setShowManualSelection(false)}
                             className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
                           >
                             Cancel
                           </button>
                           <button
                             onClick={handleManualSelectionComplete}
                             className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                           >
                             Apply Selection
                           </button>
                         </div>
                       </div>
                                           )}

                      {/* Upload Results */}
                      {uploadResults && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                            Upload Results
                          </h4>
                          
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Successful:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                  {uploadResults.success}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Failed:</span>
                                <span className="font-medium text-red-600 dark:text-red-400">
                                  {uploadResults.failed}
                                </span>
                              </div>
                            </div>
                            
                            {uploadResults.success > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex items-center text-green-600 dark:text-green-400">
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-sm font-medium">
                                    {uploadResults.success} products uploaded successfully
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                                                     {/* Failed Rows */}
                           {uploadResults.failedRows.length > 0 && (
                             <div className="mt-4">
                               <h5 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                                 Failed Rows ({uploadResults.failedRows.length}):
                               </h5>
                               <div className="overflow-x-auto">
                                 <table className="w-full text-xs border border-red-200 dark:border-red-800 rounded-lg">
                                   <thead>
                                     <tr className="bg-red-50 dark:bg-red-900/20">
                                       <th className="px-2 py-1 text-left border-b border-red-200 dark:border-red-800">
                                         Row
                                       </th>
                                       <th className="px-2 py-1 text-left border-b border-red-200 dark:border-red-800">
                                         Product Name
                                       </th>
                                       <th className="px-2 py-1 text-left border-b border-red-200 dark:border-red-800">
                                         Category
                                       </th>
                                       <th className="px-2 py-1 text-left border-b border-red-200 dark:border-red-800">
                                         Price
                                       </th>
                                       <th className="px-2 py-1 text-left border-b border-red-200 dark:border-red-800">
                                         Error
                                       </th>
                                     </tr>
                                   </thead>
                                   <tbody>
                                     {uploadResults.failedRows.slice(0, 10).map((failedRow, index) => (
                                       <tr key={index} className="border-b border-red-100 dark:border-red-800">
                                         <td className="px-2 py-1 text-gray-900 dark:text-white font-mono">
                                           {failedRow.row}
                                         </td>
                                         <td className="px-2 py-1 text-gray-900 dark:text-white">
                                           {failedRow.data.name || '-'}
                                         </td>
                                         <td className="px-2 py-1 text-gray-600 dark:text-gray-400">
                                           {failedRow.data.category || '-'}
                                         </td>
                                         <td className="px-2 py-1 text-gray-900 dark:text-white">
                                           {failedRow.data.price > 0 ? `$${failedRow.data.price.toFixed(2)}` : '-'}
                                         </td>
                                         <td className="px-2 py-1 text-red-600 dark:text-red-400 text-xs max-w-xs">
                                           <div className="break-words">
                                             {failedRow.error}
                                           </div>
                                         </td>
                                       </tr>
                                     ))}
                                   </tbody>
                                 </table>
                                 {uploadResults.failedRows.length > 10 && (
                                   <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                     <p>Showing first 10 failed rows. Total failed: {uploadResults.failedRows.length}</p>
                                     <p className="mt-1">
                                       Check the browser console for detailed debugging information.
                                     </p>
                                   </div>
                                 )}
                               </div>
                             </div>
                           )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeBulkUploadModal}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
                >
                  {uploadResults ? 'Close' : 'Cancel'}
                </button>
                                 {!uploadResults && (
                   <button
                     onClick={handleBulkUpload}
                     disabled={!selectedFile || isParsing || Boolean(parsedData && parsedData.missingFields.length > 0) || isUploading}
                     className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center"
                   >
                     {isUploading ? (
                       <>
                         <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                         Uploading... {uploadProgress}%
                       </>
                     ) : (
                       'Upload Menu'
                     )}
                   </button>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
