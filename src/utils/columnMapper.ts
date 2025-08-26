// Import AI matcher with error handling
let matchColumnsWithAI: ((headers: string[]) => Promise<Record<string, string | null>>) | null = null;

// Dynamic import for AI matcher
const loadAIMatcher = async () => {
  try {
    console.log('🔄 Loading AI column matcher...');
    const aiModule = await import('./aiColumnMatcher');
    console.log('✅ AI column matcher loaded successfully');
    return aiModule.matchColumnsWithAI;
  } catch (error) {
    console.warn('⚠️ AI column matcher not available:', error);
    return null;
  }
};

export interface ColumnMapping {
  name: number | null;
  category: number | null;
  description: number | null;
  price: number | null;
}

export interface ColumnDetectionResult {
  mapping: ColumnMapping;
  headers: string[];
  previewData: ParsedRow[];
  missingFields: string[];
  allData: (string | number | null)[][];
  aiMatches?: Record<string, string | null>; // AI matching results for debugging
  synonymMatches?: Record<string, string | null>; // Synonym matching results for debugging
  detectionMethod?: 'synonym' | 'ai' | 'hybrid' | 'manual'; // Which method was used
}

export interface ParsedRow {
  name: string;
  category: string;
  description: string;
  price: number;
}

// Debug mode toggle - set to true to enable detailed logging
const DEBUG_MODE = true;

// Column detection synonyms (English + Romanian) - primary detection method
export const columnSynonyms = {
  name: [
    // English
    'product', 'name', 'dish', 'item', 'title', 'product name', 'dish name', 'item name',
    // Romanian
    'produs', 'nume', 'fel', 'articol', 'titlu', 'nume produs', 'nume fel', 'nume articol',
    'denumire', 'denumirea', 'produsul', 'felul', 'articolul'
  ],
  category: [
    // English
    'category', 'type', 'section', 'group', 'classification', 'menu section',
    // Romanian
    'categorie', 'tip', 'sectiune', 'grup', 'clasificare', 'sectiune meniu',
    'categoria', 'tipul', 'sectiunea', 'grupa', 'clasificarea'
  ],
  description: [
    // English
    'description', 'details', 'ingredients', 'notes', 'info', 'summary', 'about',
    // Romanian
    'descriere', 'detalii', 'ingrediente', 'note', 'informatii', 'sumar',
    'descrierea', 'detaliile', 'ingredientele', 'notele', 'informatia'
  ],
  price: [
    // English
    'price', 'cost', 'amount', 'value', 'rate', 'cost price', 'menu price',
    // Romanian
    'pret', 'cost', 'suma', 'valoare', 'rata', 'pret cost', 'pret meniu',
    'pretul', 'costul', 'suma', 'valoarea', 'rata', 'pretul cost', 'pretul meniu'
  ]
};

// Columns to ignore (irrelevant fields)
const IGNORED_COLUMNS = [
  'id', 'sku', 'code', 'stock', 'barcode', 'ean', 'upc', 'reference',
  'created', 'updated', 'modified', 'date', 'timestamp',
  'row', 'index', 'number', 'seq', 'sequence',
  // Romanian equivalents
  'identificator', 'cod', 'stoc', 'cod_bare', 'referinta',
  'creat', 'actualizat', 'modificat', 'data', 'marca_timp',
  'rand', 'indice', 'numar', 'secventa'
];

/**
 * Check if a column should be ignored
 */
function shouldIgnoreColumn(header: string): boolean {
  const normalizedHeader = header.toLowerCase().trim();
  return IGNORED_COLUMNS.some(ignored => normalizedHeader.includes(ignored));
}

/**
 * Synonym-based column detection (fast method)
 */
function detectColumnsWithSynonyms(headers: string[]): { mapping: ColumnMapping; matches: Record<string, string | null> } {
  const mapping: ColumnMapping = {
    name: null,
    category: null,
    description: null,
    price: null
  };
  
  const matches: Record<string, string | null> = {};

  headers.forEach((header, index) => {
    // Skip ignored columns
    if (shouldIgnoreColumn(header)) {
      if (DEBUG_MODE) console.log(`🚫 Ignoring column: "${header}" (matches ignored pattern)`);
      matches[header] = null;
      return;
    }
    
    const normalizedHeader = header.toLowerCase().trim();
    let matched = false;
    
    // Check each field type
    Object.entries(columnSynonyms).forEach(([field, synonyms]) => {
      if (synonyms.some(synonym => normalizedHeader.includes(synonym))) {
        mapping[field as keyof ColumnMapping] = index;
        matches[header] = field;
        matched = true;
        if (DEBUG_MODE) console.log(`📝 Synonym matched "${header}" → ${field}`);
      }
    });
    
    if (!matched) {
      matches[header] = null;
      if (DEBUG_MODE) console.log(`❓ No synonym match for "${header}"`);
    }
  });
  
  return { mapping, matches };
}

/**
 * Hybrid column detection: synonyms first, then AI for unmatched fields
 */
export async function detectColumns(headers: string[]): Promise<ColumnMapping> {
  if (DEBUG_MODE) {
    console.log('🔍 Starting hybrid column detection...');
    console.log('📋 Headers to process:', headers);
  }
  
  // Step 1: Try synonym-based detection first (fast)
  const synonymResult = detectColumnsWithSynonyms(headers);
  const synonymMatchedFields = Object.values(synonymResult.mapping).filter(index => index !== null).length;
  
  if (DEBUG_MODE) {
    console.log(`✅ Synonym detection completed: ${synonymMatchedFields}/4 fields matched`);
    console.log('📊 Synonym matches:', synonymResult.matches);
  }
  
  // If all fields are matched, return early
  if (synonymMatchedFields === 4) {
    if (DEBUG_MODE) console.log('🎯 All fields matched with synonyms - no AI needed');
    return synonymResult.mapping;
  }
  
  // Step 2: Use AI for unmatched fields
  const unmappedFields = Object.entries(synonymResult.mapping)
    .filter(([, index]) => index === null)
    .map(([field]) => field);
  
  if (DEBUG_MODE) {
    console.log(`🤖 Unmatched fields requiring AI: ${unmappedFields.join(', ')}`);
  }
  
  try {
    // Load AI matcher if not already loaded
    if (!matchColumnsWithAI) {
      matchColumnsWithAI = await loadAIMatcher();
    }
    
    // Check if AI matcher is available
    if (!matchColumnsWithAI) {
      if (DEBUG_MODE) console.log('⚠️ AI matcher not available, using synonym results only');
      return synonymResult.mapping;
    }
    
    // Get AI matches for all headers
    const aiMatches = await matchColumnsWithAI(headers);
    
    if (DEBUG_MODE) {
      console.log('🧠 AI matching results:', aiMatches);
    }
    
    // Merge AI results with synonym results
    const finalMapping = { ...synonymResult.mapping };
    
    headers.forEach((header, index) => {
      const aiMatch = aiMatches[header];
      if (aiMatch && finalMapping[aiMatch as keyof ColumnMapping] === null) {
        // Only use AI match if the field isn't already mapped by synonyms
        finalMapping[aiMatch as keyof ColumnMapping] = index;
        if (DEBUG_MODE) console.log(`🤖 AI matched "${header}" → ${aiMatch}`);
      }
    });
    
    const totalMatchedFields = Object.values(finalMapping).filter(index => index !== null).length;
    
    if (DEBUG_MODE) {
      console.log(`🎯 Final hybrid result: ${totalMatchedFields}/4 fields matched`);
      console.log('📊 Final mapping:', finalMapping);
    }
    
    return finalMapping;
    
  } catch (error) {
    if (DEBUG_MODE) {
      console.error('❌ AI column detection failed, using synonym results only:', error);
    }
    
    // Return synonym results if AI fails
    return synonymResult.mapping;
  }
}

/**
 * Enhanced column detection with detailed result tracking
 */
export async function detectColumnsWithDetails(headers: string[]): Promise<ColumnDetectionResult> {
  if (DEBUG_MODE) {
    console.log('🔍 Starting detailed column detection...');
    console.log('📋 Headers to process:', headers);
  }
  
  // Step 1: Synonym detection
  const synonymResult = detectColumnsWithSynonyms(headers);
  const synonymMatchedFields = Object.values(synonymResult.mapping).filter(index => index !== null).length;
  
  // Step 2: AI detection for unmatched fields
  let aiMatches: Record<string, string | null> = {};
  let detectionMethod: 'synonym' | 'ai' | 'hybrid' | 'manual' = 'synonym';
  
  if (synonymMatchedFields < 4) {
    console.log(`🤖 AI detection needed - only ${synonymMatchedFields}/4 fields matched with synonyms`);
    try {
      // Load AI matcher if not already loaded
      if (!matchColumnsWithAI) {
        matchColumnsWithAI = await loadAIMatcher();
      }
      
      if (matchColumnsWithAI) {
        console.log('🧠 Calling AI column matcher...');
        aiMatches = await matchColumnsWithAI(headers);
        
        // Merge results
        const finalMapping = { ...synonymResult.mapping };
        headers.forEach((header, index) => {
          const aiMatch = aiMatches[header];
          if (aiMatch && finalMapping[aiMatch as keyof ColumnMapping] === null) {
            finalMapping[aiMatch as keyof ColumnMapping] = index;
          }
        });
        
        const totalMatchedFields = Object.values(finalMapping).filter(index => index !== null).length;
        detectionMethod = synonymMatchedFields > 0 ? 'hybrid' : 'ai';
        
        if (DEBUG_MODE) {
          console.log(`🎯 Hybrid detection: ${totalMatchedFields}/4 fields matched`);
        }
        
        const missingFields = Object.entries(finalMapping)
          .filter(([, index]) => index === null)
          .map(([field]) => field);
        
        return {
          mapping: finalMapping,
          headers,
          previewData: [], // Will be populated by caller
          missingFields,
          allData: [], // Will be populated by caller
          aiMatches,
          synonymMatches: synonymResult.matches,
          detectionMethod
        };
      }
    } catch (error) {
      if (DEBUG_MODE) {
        console.error('❌ AI detection failed, using synonym results:', error);
      }
      detectionMethod = 'synonym';
    }
  }
  
  const missingFields = Object.entries(synonymResult.mapping)
    .filter(([, index]) => index === null)
    .map(([field]) => field);
  
  return {
    mapping: synonymResult.mapping,
    headers,
    previewData: [], // Will be populated by caller
    missingFields,
    allData: [], // Will be populated by caller
    aiMatches,
    synonymMatches: synonymResult.matches,
    detectionMethod
  };
}

export function parseRowData(
  row: (string | number | null)[], 
  mapping: ColumnMapping
): ParsedRow {
  return {
    name: mapping.name !== null ? (String(row[mapping.name] ?? '') || '') : '',
    category: mapping.category !== null ? (String(row[mapping.category] ?? '') || '') : '',
    description: mapping.description !== null ? (String(row[mapping.description] ?? '') || '') : '',
    price: mapping.price !== null ? (parseFloat(String(row[mapping.price] ?? '0')) || 0) : 0
  };
}

export function validateParsedRow(row: ParsedRow): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate product name
  if (!row.name.trim()) {
    errors.push('Product name is required');
  } else if (row.name.trim().length < 2) {
    errors.push('Product name must be at least 2 characters');
  }

  // Validate price
  if (row.price <= 0) {
    errors.push('Price must be greater than 0');
  } else if (isNaN(row.price)) {
    errors.push('Price must be a valid number');
  } else if (row.price > 999999) {
    errors.push('Price is too high (max 999,999)');
  }

  // Validate description length
  if (row.description && row.description.length > 500) {
    errors.push('Description is too long (max 500 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function getSkippedColumns(headers: string[], mapping: ColumnMapping): string[] {
  const mappedColumns = Object.values(mapping).filter(index => index !== null);
  const skippedColumns = headers.filter((header, index) => {
    // Skip if mapped or should be ignored
    return !mappedColumns.includes(index) && !shouldIgnoreColumn(header);
  });
  
  if (DEBUG_MODE) {
    console.log('📊 Column analysis:');
    console.log(`  - Total columns: ${headers.length}`);
    console.log(`  - Mapped columns: ${mappedColumns.length}`);
    console.log(`  - Ignored columns: ${headers.filter(h => shouldIgnoreColumn(h)).length}`);
    console.log(`  - Skipped columns: ${skippedColumns.length}`);
    console.log(`  - Skipped column names:`, skippedColumns);
  }
  
  return skippedColumns;
}
