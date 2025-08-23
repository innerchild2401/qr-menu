import QRCode from 'qrcode';
import { uploadFile, getPublicUrl, STORAGE_BUCKETS, deleteFile } from './supabase-server';

/**
 * Generate QR code for a restaurant's menu URL
 */
export async function generateQRCode(menuUrl: string): Promise<Buffer> {
  try {
    // Generate QR code as PNG buffer with white background and margin
    const qrCodeBuffer = await QRCode.toBuffer(menuUrl, {
      type: 'png',
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });

    return qrCodeBuffer;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Upload QR code to Supabase Storage and return public URL
 */
export async function uploadQRCode(
  restaurantSlug: string,
  qrCodeBuffer: Buffer
): Promise<{ publicUrl: string; storagePath: string }> {
  try {
    // Create filename with restaurant slug as requested
    const fileName = `${restaurantSlug}.png`;
    const storagePath = fileName; // Store directly in qr-codes bucket root

    // Upload to Supabase Storage
    const { error } = await uploadFile(
      STORAGE_BUCKETS.QR_CODES,
      storagePath,
      qrCodeBuffer,
      {
        contentType: 'image/png',
        upsert: true // Replace existing file if it exists
      }
    );

    if (error) {
      console.error('Supabase QR upload error:', error);
      throw new Error('Failed to upload QR code to storage');
    }

    // Get public URL
    const publicUrl = getPublicUrl(STORAGE_BUCKETS.QR_CODES, storagePath);

    return {
      publicUrl,
      storagePath
    };
  } catch (error) {
    console.error('Error uploading QR code:', error);
    throw error;
  }
}

/**
 * Delete existing QR code from storage
 */
export async function deleteQRCode(storagePath: string): Promise<void> {
  try {
    const { error } = await deleteFile(STORAGE_BUCKETS.QR_CODES, storagePath);
    
    if (error) {
      console.error('Error deleting QR code:', error);
      // Don't throw error for deletion failures as it's not critical
    }
  } catch (error) {
    console.error('Error deleting QR code:', error);
    // Don't throw error for deletion failures
  }
}

/**
 * Generate and upload QR code for a restaurant
 * Returns the public URL of the uploaded QR code
 */
export async function generateAndUploadQRCode(
  restaurantSlug: string,
  baseUrl: string = process.env.NEXTAUTH_URL || 'http://localhost:3000'
): Promise<string> {
  try {
    // Construct menu URL
    const menuUrl = `${baseUrl}/menu/${restaurantSlug}`;

    // Generate QR code
    const qrCodeBuffer = await generateQRCode(menuUrl);

    // Upload to storage
    const { publicUrl } = await uploadQRCode(restaurantSlug, qrCodeBuffer);

    return publicUrl;
  } catch (error) {
    console.error('Error in generateAndUploadQRCode:', error);
    throw error;
  }
}

/**
 * Get QR code download URL for admin interface
 */
export function getQRCodeDownloadUrl(qrCodeUrl: string): string {
  // Return the public URL directly since it's already accessible
  return qrCodeUrl;
}

/**
 * Regenerate QR code for a restaurant (useful for URL changes or updates)
 */
export async function regenerateQRCode(
  restaurantSlug: string,
  existingQRPath?: string,
  baseUrl: string = process.env.NEXTAUTH_URL || 'http://localhost:3000'
): Promise<string> {
  try {
    // Delete existing QR code if path is provided
    if (existingQRPath) {
      await deleteQRCode(existingQRPath);
    }

    // Generate new QR code
    const newQRUrl = await generateAndUploadQRCode(restaurantSlug, baseUrl);

    return newQRUrl;
  } catch (error) {
    console.error('Error regenerating QR code:', error);
    throw error;
  }
}
