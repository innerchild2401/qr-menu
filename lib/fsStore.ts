import fs from 'fs/promises';
import path from 'path';

/**
 * Read and parse a JSON file
 */
export async function readJson<T = unknown>(filePath: string): Promise<T> {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    const data = await fs.readFile(fullPath, 'utf-8');
    return JSON.parse(data) as T;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw new Error(`Failed to read JSON file: ${filePath}. ${error}`);
  }
}

/**
 * Write data to a JSON file
 */
export async function writeJson(filePath: string, data: unknown): Promise<void> {
  try {
    const fullPath = path.resolve(process.cwd(), filePath);
    
    // Ensure the directory exists
    await ensureDir(path.dirname(fullPath));
    
    const jsonString = JSON.stringify(data, null, 2);
    await fs.writeFile(fullPath, jsonString, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write JSON file: ${filePath}. ${error}`);
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    const fullPath = path.resolve(process.cwd(), dirPath);
    await fs.mkdir(fullPath, { recursive: true });
  } catch (error) {
    throw new Error(`Failed to ensure directory: ${dirPath}. ${error}`);
  }
}
