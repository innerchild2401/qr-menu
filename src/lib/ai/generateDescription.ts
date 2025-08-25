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

    const prompt = `Write a short, enticing product description for "${productName}" in a friendly, natural tone.`;
    const output = await generator(prompt, { 
      max_length: 100,
      do_sample: true,
      temperature: 0.7,
      top_p: 0.9
    });

    return output[0].generated_text.trim();
  } catch (error) {
    console.error("Error generating AI description:", error);
    // Return a fallback description if AI generation fails
    return `Delicious ${productName.toLowerCase()} - a must-try item on our menu!`;
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
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error generating description for ${productName}:`, error);
      descriptions.push(`Delicious ${productName.toLowerCase()} - a must-try item on our menu!`);
    }
  }
  
  return descriptions;
}

// Check if AI model is ready
export function isAIModelReady(): boolean {
  return generator !== null && generator !== undefined;
}
