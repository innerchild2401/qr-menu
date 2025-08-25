'use client';

import { useState, useRef } from 'react';
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
} from '../../utils/columnMapper';
import { MenuUploader } from '../../services/menuUploader';
import { downloadMenuTemplate } from '../../utils/templateGenerator';
import { generateDescriptionsBatch } from '../../lib/ai/generateDescription';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  user: { id: string; email?: string } | null;
}

export default function BulkUploadModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  showSuccess, 
  showError, 
  user 
}: BulkUploadModalProps) {
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
  const [aiDescriptions, setAiDescriptions] = useState<{ [key: string]: string }>({});
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const bulkUploadInputRef = useRef<HTMLInputElement>(null);

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
      
      // Generate AI descriptions for products
      if (result.previewData.length > 0) {
        setIsGeneratingAI(true);
        try {
          const productNames = result.previewData.map(row => row.name).filter(name => name.trim());
          if (productNames.length > 0) {
            const aiDescriptionsList = await generateDescriptionsBatch(productNames);
            const aiDescriptionsMap: { [key: string]: string } = {};
            productNames.forEach((name, index) => {
              aiDescriptionsMap[name] = aiDescriptionsList[index];
            });
            setAiDescriptions(aiDescriptionsMap);
          }
        } catch (error) {
          console.error('Error generating AI descriptions:', error);
        } finally {
          setIsGeneratingAI(false);
        }
      }
      
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
      const allDataRows = lines.slice(1); // ALL data rows, not just first 5
      const previewDataRows = allDataRows.slice(0, 5); // First 5 for preview only
      
      const result = await detectColumnsWithDetails(headers);
      const previewData: ParsedRow[] = [];
      
      previewDataRows.forEach(row => {
        const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
        if (values.length >= headers.length) {
          previewData.push(parseRowData(values, result.mapping));
        }
      });

      // Convert ALL data rows to the format needed for upload
      const allData: (string | number | null)[][] = allDataRows.map(row => 
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
      const allDataRows: (string | number | null)[][] = [];
      
      // Extract headers and ALL data rows
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          // Headers
          row.eachCell((cell) => {
            headers.push(String(cell.value ?? ''));
          });
        } else {
          // ALL data rows
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
          allDataRows.push(rowData);
        }
      });

      const result = await detectColumnsWithDetails(headers);
      const previewData: ParsedRow[] = [];
      
      // Use first 5 rows for preview
      allDataRows.slice(0, 5).forEach(row => {
        previewData.push(parseRowData(row, result.mapping));
      });

      // Convert ALL data rows to the format needed for upload
      const allData: (string | number | null)[][] = allDataRows.map(row => 
        row.map(cell => cell === null || cell === undefined ? null : String(cell))
      );

      return {
        ...result,
        previewData,
        allData
      };
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
    console.log('🚀 Starting bulk upload...');
    console.log('📊 Parsed data:', parsedData);
    console.log('👤 User:', user);
    
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
      const response = await fetch('/api/admin/me/restaurant', {
        headers: {
          'x-user-id': user.id
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get restaurant information');
      }
      
      const restaurantData = await response.json();
      const restaurantId = restaurantData.restaurant?.id;
      
      if (!restaurantId) {
        throw new Error('No restaurant found for the current user');
      }

      console.log('📋 Total rows to process:', parsedData.allData.length);
      
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
      
      console.log('✅ Valid rows:', allParsedRows.length);
      console.log('❌ Validation errors:', validationErrors.length);
      console.log('📝 Sample valid row:', allParsedRows[0]);

      // Enhance rows with AI descriptions where user descriptions are missing
      const enhancedRows = allParsedRows.map(row => {
        if (!row.description || row.description.trim() === '') {
          const aiDescription = aiDescriptions[row.name];
          if (aiDescription) {
            return { ...row, description: aiDescription };
          }
        }
        return row;
      });

      // Filter out rows with missing required data
      const validRows = enhancedRows.filter(row => 
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
        onSuccess(); // Refresh the products list
        
        // Auto-close modal after successful upload
        setTimeout(() => {
          closeModal();
        }, 2000); // Close after 2 seconds to show the success message
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

  const closeModal = () => {
    onClose();
    handleClearFile();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Bulk Upload Menu
            </h2>
            <button
              onClick={closeModal}
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
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6">
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
                              <div className="space-y-1">
                                {row.description ? (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">User Description:</p>
                                    <p>{row.description}</p>
                                  </div>
                                ) : null}
                                {aiDescriptions[row.name] && (
                                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                                    <div className="flex items-center gap-1 mb-1">
                                      <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded">AI Suggested</span>
                                      {isGeneratingAI && (
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                                      )}
                                    </div>
                                    <p className="text-xs italic text-blue-700 dark:text-blue-300">{aiDescriptions[row.name]}</p>
                                  </div>
                                )}
                              </div>
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
                <div className="mt-6 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-4">
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

                  <div className="mt-4 flex justify-end space-x-3 sticky bottom-0 bg-white dark:bg-gray-800 pt-4 border-t border-gray-200 dark:border-gray-600">
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

        {/* Footer */}
        <div className="p-6 flex-shrink-0 border-t border-gray-200 dark:border-gray-600">
          <div className="flex justify-between items-center">
            <button
              onClick={handleDownloadTemplate}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Template
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={closeModal}
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

        {/* Hidden file input */}
        <input
          ref={bulkUploadInputRef}
          type="file"
          accept=".xls,.xlsx,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
