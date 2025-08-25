import fs from 'fs/promises';
import path from 'path';
import { ensureDir } from './fsStore';

// Allowed file types
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff'];

// File size limit: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

export interface UploadError {
  error: string;
  code: 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'INVALID_NAME' | 'SAVE_ERROR';
}

/**
 * Sanitize filename by removing dangerous characters and normalizing
 */
export function sanitizeFilename(filename: string): string {
  // Get file extension
  const ext = path.extname(filename).toLowerCase();
  const name = path.basename(filename, ext);
  
  // Remove dangerous characters and normalize
  const sanitized = name
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .toLowerCase();
  
  // Ensure we have a name
  const finalName = sanitized || 'upload';
  
  return `${finalName}${ext}`;
}

// Backward compatibility alias (for any old cached references)
export const sanitizeFileName = sanitizeFilename;

/**
 * Validate file type and size
 */
export function validateFile(file: File): UploadError | null {
  // Check file size first
  if (file.size > MAX_FILE_SIZE) {
    return {
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      code: 'FILE_TOO_LARGE'
    };
  }
  
  // Check file type - be more permissive
  const ext = path.extname(file.name).toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  // Allow if either MIME type or extension is valid
  const isValidMimeType = ALLOWED_TYPES.includes(mimeType);
  const isValidExtension = ALLOWED_EXTENSIONS.includes(ext);
  
  if (!isValidMimeType && !isValidExtension) {
    return {
      error: `Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      code: 'INVALID_TYPE'
    };
  }
  
  return null;
}

// Backward compatibility alias (for any old cached references)
export const validateUploadFile = validateFile;

/**
 * Save uploaded file to the uploads directory
 */
export async function saveUploadedFile(
  file: File, 
  slug: string
): Promise<UploadResult | UploadError> {
  try {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      return validationError;
    }
    
    // Sanitize filename
    const sanitizedName = sanitizeFilename(file.name);
    
    // Create timestamp prefix
    const timestamp = Date.now();
    const finalFilename = `${timestamp}_${sanitizedName}`;
    
    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', slug);
    await ensureDir(uploadDir);
    
    // Save file
    const filePath = path.join(uploadDir, finalFilename);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await fs.writeFile(filePath, buffer);
    
    // Return relative URL
    const relativeUrl = `/uploads/${slug}/${finalFilename}`;
    
    return {
      url: relativeUrl,
      filename: finalFilename,
      size: file.size
    };
  } catch (error) {
    console.error('Error saving uploaded file:', error);
    return {
      error: 'Failed to save file',
      code: 'SAVE_ERROR'
    };
  }
}

/**
 * Initialize uploads directory on server start
 */
export async function initializeUploadsDirectory(): Promise<void> {
  try {
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await ensureDir(uploadsDir);
    console.log('✓ Uploads directory initialized');
  } catch (error) {
    console.error('Failed to initialize uploads directory:', error);
  }
}
