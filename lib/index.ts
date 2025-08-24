// Central export file for lib modules to improve module resolution

// Re-export all functions from uploadUtils
export {
  sanitizeFilename,
  sanitizeFileName, // Backward compatibility alias
  validateFile,
  validateUploadFile, // Backward compatibility alias
  saveUploadedFile,
  initializeUploadsDirectory,
  type UploadResult,
  type UploadError
} from './uploadUtils';

// Re-export all server-side Supabase functions and types
export {
  supabaseAdmin,
  getPublicUrl,
  uploadFile,
  deleteFile,
  getRestaurantBySlug,
  getRestaurantWithData,
  getActivePopups,
  STORAGE_BUCKETS,
  type Restaurant,
  type Category,
  type Product,
  type Popup,
  type User
} from './supabase-server';

// Re-export client-side Supabase
export {
  supabasePublic
} from './supabase';

// Re-export file system utilities
export {
  readJson,
  writeJson,
  ensureDir
} from './fsStore';

// Re-export QR code utilities
export {
  generateQRCode,
  uploadQRCode,
  generateAndUploadQRCode,
  regenerateQRCode
} from './qrCodeUtils';

// Re-export server initialization
export { initializeServer } from './serverInit';
