import { pipeline, env } from '@xenova/transformers';

// Configure transformers to use local cache
env.cacheDir = './.cache/transformers';
env.allowLocalModels = false; // Use remote models for better performance

// Target field definitions with semantic meanings
const TARGET_FIELDS = {
  product_name: "Name of the product or dish",
  category: "Menu category or food section", 
  description: "Details about the product, ingredients, or taste",
  price: "Price of the product in RON or other currency"
} as const;

// Type for the transformer model
type TransformerModel = {
  (texts: string[], options?: { pooling?: string; normalize?: boolean }): Promise<{
    tolist(): number[][];
  }>;
};

// Cache for the loaded model
let modelCache: TransformerModel | null = null;
let isModelLoading = false;

/**
 * Load the sentence transformer model (cached)
 */
async function loadModel(): Promise<TransformerModel> {
  if (modelCache) {
    return modelCache;
  }
  
  if (isModelLoading) {
    // Wait for the model to finish loading
    while (isModelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (modelCache) {
      return modelCache;
    }
  }

  try {
    isModelLoading = true;
    console.log('🤖 Loading AI model for column matching...');
    
    // Load the multilingual sentence transformer model
    modelCache = await pipeline(
      'feature-extraction',
      'Xenova/paraphrase-multilingual-MiniLM-L12-v2'
    ) as TransformerModel;
    
    console.log('✅ AI model loaded successfully');
    return modelCache;
  } catch (error) {
    console.error('❌ Failed to load AI model:', error);
    throw new Error('Failed to load AI model for column matching');
  } finally {
    isModelLoading = false;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extract embeddings for a list of texts
 */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const model = await loadModel();
  
  try {
    const embeddings = await model(texts, {
      pooling: 'mean',
      normalize: true
    });
    
    return embeddings.tolist();
  } catch (error) {
    console.error('❌ Error getting embeddings:', error);
    throw new Error('Failed to generate embeddings for column matching');
  }
}

/**
 * Match column headers with target fields using AI semantic similarity
 */
export async function matchColumnsWithAI(headers: string[]): Promise<Record<string, string | null>> {
  if (!headers || headers.length === 0) {
    return {};
  }

  try {
    console.log('🧠 Starting AI-powered column matching...');
    console.log('📋 Headers to match:', headers);
    
    // Prepare texts for embedding (headers + target field meanings)
    const targetMeanings = Object.values(TARGET_FIELDS);
    const allTexts = [...headers, ...targetMeanings];
    
    // Get embeddings for all texts
    const embeddings = await getEmbeddings(allTexts);
    
    // Separate header embeddings and target meaning embeddings
    const headerEmbeddings = embeddings.slice(0, headers.length);
    const targetEmbeddings = embeddings.slice(headers.length);
    
    // Match each header to the best target field
    const matches: Record<string, string | null> = {};
    const usedTargets = new Set<string>();
    
    headers.forEach((header, headerIndex) => {
      let bestMatch: string | null = null;
      let bestScore = 0;
      
      // Calculate similarity with each target field
      Object.entries(TARGET_FIELDS).forEach(([targetField, targetMeaning], targetIndex) => {
        if (usedTargets.has(targetField)) {
          return; // Skip already matched targets
        }
        
        const similarity = cosineSimilarity(
          headerEmbeddings[headerIndex],
          targetEmbeddings[targetIndex]
        );
        
        console.log(`🔍 "${header}" ↔ "${targetMeaning}": ${similarity.toFixed(3)}`);
        
        if (similarity > bestScore && similarity >= 0.65) {
          bestScore = similarity;
          bestMatch = targetField;
        }
      });
      
      if (bestMatch) {
        matches[header] = bestMatch;
        usedTargets.add(bestMatch);
        console.log(`✅ Matched "${header}" → ${bestMatch} (score: ${bestScore.toFixed(3)})`);
      } else {
        matches[header] = null;
        console.log(`❌ No confident match for "${header}" (best score: ${bestScore.toFixed(3)})`);
      }
    });
    
    console.log('🎯 AI column matching results:', matches);
    return matches;
    
  } catch (error) {
    console.error('❌ AI column matching failed:', error);
    // Return empty matches to fall back to manual mapping
    return headers.reduce((acc, header) => {
      acc[header] = null;
      return acc;
    }, {} as Record<string, string | null>);
  }
}

/**
 * Get target field meanings for reference
 */
export function getTargetFieldMeanings(): Record<string, string> {
  return { ...TARGET_FIELDS };
}
