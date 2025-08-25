import { supabase } from '@/lib/auth-supabase';
import { ParsedRow } from '@/utils/columnMapper';

export interface UploadResult {
  success: number;
  failed: number;
  failedRows: Array<{ row: number; error: string; data: ParsedRow }>;
}

export interface ValidationError {
  row: number;
  error: string;
  data: ParsedRow;
}

export class MenuUploader {
  private restaurantId: string;

  constructor(restaurantId: string) {
    this.restaurantId = restaurantId;
  }

  async uploadMenu(validRows: ParsedRow[]): Promise<UploadResult> {
    if (validRows.length === 0) {
      return {
        success: 0,
        failed: 0,
        failedRows: []
      };
    }

    try {
      // Collect unique categories
      const uniqueCategories = [...new Set(validRows.map(row => row.category.trim()).filter(cat => cat))];

      // Upsert categories first
      const categoryMap = await this.upsertCategories(uniqueCategories);

      // Prepare products data
      const productUpsertData = validRows.map(row => ({
        name: row.name.trim(),
        description: row.description.trim() || null,
        price: row.price,
        category_id: row.category.trim() ? categoryMap.get(row.category.trim()) || null : null,
        restaurant_id: this.restaurantId
      }));

      // Upsert products
      const { data: productData, error: productError } = await supabase
        .from('products')
        .upsert(productUpsertData, { 
          onConflict: 'name,restaurant_id',
          ignoreDuplicates: false 
        })
        .select('id, name');

      if (productError) {
        throw new Error(`Failed to upsert products: ${productError.message}`);
      }

      // Calculate results
      const successCount = productData?.length || 0;
      const failedCount = validRows.length - successCount;
      const failedRows: Array<{ row: number; error: string; data: ParsedRow }> = [];

      // Check for any failed rows
      if (failedCount > 0) {
        validRows.forEach((row, index) => {
          const productExists = productData?.some(p => p.name === row.name.trim());
          if (!productExists) {
            failedRows.push({
              row: index + 1,
              error: 'Failed to insert product',
              data: row
            });
          }
        });
      }

      return {
        success: successCount,
        failed: failedRows.length,
        failedRows
      };

    } catch (error) {
      console.error('Menu upload error:', error);
      throw error;
    }
  }

  private async upsertCategories(uniqueCategories: string[]): Promise<Map<string, string>> {
    const categoryMap = new Map<string, string>();

    if (uniqueCategories.length === 0) {
      return categoryMap;
    }

    const categoryUpsertData = uniqueCategories.map(categoryName => ({
      name: categoryName,
      restaurant_id: this.restaurantId
    }));

    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .upsert(categoryUpsertData, { 
        onConflict: 'name,restaurant_id',
        ignoreDuplicates: false 
      })
      .select('id, name');

    if (categoryError) {
      throw new Error(`Failed to upsert categories: ${categoryError.message}`);
    }

    // Create mapping from category name to category id
    categoryData?.forEach(cat => {
      categoryMap.set(cat.name, cat.id);
    });

    return categoryMap;
  }
}
