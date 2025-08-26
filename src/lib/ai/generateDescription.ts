import { pipeline } from "@xenova/transformers";

interface GeneratorOutput {
  generated_text: string;
}

interface Generator {
  (prompt: string, options: Record<string, unknown>): Promise<GeneratorOutput[]>;
}

let generator: Generator | null = null;
let isInitializing = false;
let initPromise: Promise<Generator> | null = null;

// Detect if text is in Romanian
function isRomanian(text: string): boolean {
  const romanianChars = /[ăâîșțĂÂÎȘȚ]/;
  const romanianWords = [
    'pizza', 'salată', 'soupă', 'desert', 'băutură', 'cafea', 'bere', 'vin',
    'carne', 'pește', 'pui', 'vegetarian', 'vegan', 'gluten', 'lactoză',
    'gustos', 'delicios', 'fresc', 'cald', 'rece', 'picant', 'dulce', 'sărat',
    'mic', 'mare', 'mediu', 'porție', 'gram', 'kilogram', 'litru', 'bucată'
  ];
  
  const lowerText = text.toLowerCase();
  return romanianChars.test(text) || romanianWords.some(word => lowerText.includes(word));
}

export async function generateDescription(productName: string): Promise<string> {
  try {
    // Initialize the model if not already done
    if (!generator && !isInitializing) {
      isInitializing = true;
      initPromise = pipeline("text2text-generation", "google/flan-t5-small") as Promise<Generator>;
      generator = await initPromise;
      isInitializing = false;
    } else if (isInitializing && initPromise) {
      // Wait for initialization to complete
      generator = await initPromise;
    }

    if (!generator) {
      throw new Error("Failed to initialize AI model");
    }

    // Detect language and create appropriate prompt
    const isRomanianText = isRomanian(productName);
    
    const prompt = isRomanianText 
      ? `Scrie o descriere scurtă și atractivă pentru "${productName}" într-un ton prietenos și natural, în limba română.`
      : `Write a short, enticing product description for "${productName}" in a friendly, natural tone in English.`;

    const output = await generator(prompt, { 
      max_length: 120,
      do_sample: true,
      temperature: 0.8,
      top_p: 0.9
    });

    return output[0].generated_text.trim();
  } catch (error) {
    console.error("Error generating AI description:", error);
    // Return a fallback description in the detected language
    const isRomanianText = isRomanian(productName);
    return isRomanianText 
      ? `Delicios ${productName.toLowerCase()} - un produs de încercat din meniul nostru!`
      : `Delicious ${productName.toLowerCase()} - a must-try item on our menu!`;
  }
}

// Batch generation for multiple products
export async function generateDescriptionsBatch(productNames: string[]): Promise<string[]> {
  const descriptions: string[] = [];
  
  for (const productName of productNames) {
    try {
      const description = await generateDescription(productName);
      descriptions.push(description);
      
      // Add a small delay to prevent overwhelming the model
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error generating description for ${productName}:`, error);
      // Use language-appropriate fallback
      const isRomanianText = isRomanian(productName);
      const fallback = isRomanianText 
        ? `Delicios ${productName.toLowerCase()} - un produs de încercat din meniul nostru!`
        : `Delicious ${productName.toLowerCase()} - a must-try item on our menu!`;
      descriptions.push(fallback);
    }
  }
  
  return descriptions;
}

// Check if AI model is ready
export function isAIModelReady(): boolean {
  return generator !== null && generator !== undefined;
}
