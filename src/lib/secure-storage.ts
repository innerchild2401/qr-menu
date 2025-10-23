/**
 * Secure Client-Side Storage
 * Provides encrypted and secure storage for sensitive data
 */

interface StorageItem {
  data: unknown;
  timestamp: number;
  expires?: number;
}

class SecureStorage {
  private static instance: SecureStorage;
  private encryptionKey: string | null = null;

  private constructor() {
    this.initializeEncryption();
  }

  public static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * Initialize encryption key
   */
  private initializeEncryption(): void {
    // Use a combination of browser fingerprint and session for encryption
    const fingerprint = this.getBrowserFingerprint();
    this.encryptionKey = btoa(fingerprint).substring(0, 32);
  }

  /**
   * Get browser fingerprint for encryption
   */
  private getBrowserFingerprint(): string {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return 'server-side-fallback';
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Browser fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    return fingerprint;
  }

  /**
   * Simple encryption (for production, use Web Crypto API)
   */
  private encrypt(data: string): string {
    if (!this.encryptionKey) return data;
    
    try {
      let encrypted = '';
      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
        encrypted += String.fromCharCode(charCode);
      }
      return btoa(encrypted);
    } catch {
      return data; // Fallback to unencrypted if encryption fails
    }
  }

  /**
   * Simple decryption
   */
  private decrypt(encryptedData: string): string {
    if (!this.encryptionKey) return encryptedData;
    
    try {
      const data = atob(encryptedData);
      let decrypted = '';
      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i) ^ this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
        decrypted += String.fromCharCode(charCode);
      }
      return decrypted;
    } catch {
      return encryptedData; // Fallback if decryption fails
    }
  }

  /**
   * Store data securely
   */
  public setItem(key: string, value: unknown, expiresIn?: number): boolean {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return false;
      }

      const item: StorageItem = {
        data: value,
        timestamp: Date.now(),
        expires: expiresIn ? Date.now() + expiresIn : undefined
      };

      const encryptedData = this.encrypt(JSON.stringify(item));
      localStorage.setItem(`secure_${key}`, encryptedData);
      return true;
    } catch (error) {
      console.error('Secure storage setItem failed:', error);
      return false;
    }
  }

  /**
   * Retrieve data securely
   */
  public getItem(key: string): unknown {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return null;
      }

      const encryptedData = localStorage.getItem(`secure_${key}`);
      if (!encryptedData) return null;

      const decryptedData = this.decrypt(encryptedData);
      const item: StorageItem = JSON.parse(decryptedData);

      // Check if expired
      if (item.expires && Date.now() > item.expires) {
        this.removeItem(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.error('Secure storage getItem failed:', error);
      return null;
    }
  }

  /**
   * Remove data
   */
  public removeItem(key: string): boolean {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return false;
      }

      localStorage.removeItem(`secure_${key}`);
      return true;
    } catch (error) {
      console.error('Secure storage removeItem failed:', error);
      return false;
    }
  }

  /**
   * Clear all secure storage
   */
  public clear(): boolean {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return false;
      }

      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('secure_')) {
          localStorage.removeItem(key);
        }
      });
      return true;
    } catch (error) {
      console.error('Secure storage clear failed:', error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  public hasItem(key: string): boolean {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem(`secure_${key}`) !== null;
  }

  /**
   * Get all secure storage keys
   */
  public getKeys(): string[] {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return [];
    }

    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('secure_')) {
        keys.push(key.substring(7)); // Remove 'secure_' prefix
      }
    }
    return keys;
  }

  /**
   * Clean expired items
   */
  public cleanExpired(): number {
    let cleaned = 0;
    const keys = this.getKeys();
    
    keys.forEach(key => {
      const item = this.getItem(key);
      if (item === null) {
        // Item was expired and removed
        cleaned++;
      }
    });
    
    return cleaned;
  }
}

// Export singleton instance
export const secureStorage = SecureStorage.getInstance();

// Export convenience functions
export function setSecureItem(key: string, value: unknown, expiresIn?: number): boolean {
  return secureStorage.setItem(key, value, expiresIn);
}

export function getSecureItem(key: string): unknown {
  return secureStorage.getItem(key);
}

export function removeSecureItem(key: string): boolean {
  return secureStorage.removeItem(key);
}

export function clearSecureStorage(): boolean {
  return secureStorage.clear();
}

export function hasSecureItem(key: string): boolean {
  return secureStorage.hasItem(key);
}

// Specific storage functions for common use cases
export const staffStorage = {
  setUser: (user: unknown) => setSecureItem('staff_user', user, 24 * 60 * 60 * 1000), // 24 hours
  getUser: () => getSecureItem('staff_user'),
  removeUser: () => removeSecureItem('staff_user'),
  
  setCategories: (categories: unknown) => setSecureItem('staff_categories', categories, 24 * 60 * 60 * 1000), // 24 hours
  getCategories: () => getSecureItem('staff_categories'),
  removeCategories: () => removeSecureItem('staff_categories'),
  
  clear: () => {
    removeSecureItem('staff_user');
    removeSecureItem('staff_categories');
  }
};

export const menuStorage = {
  setOrder: (order: unknown) => setSecureItem('menu_order', order, 2 * 60 * 60 * 1000), // 2 hours
  getOrder: () => getSecureItem('menu_order'),
  removeOrder: () => removeSecureItem('menu_order')
};

export const sessionStorage = {
  set: (key: string, value: unknown, expiresIn?: number) => setSecureItem(`session_${key}`, value, expiresIn),
  get: (key: string) => getSecureItem(`session_${key}`),
  remove: (key: string) => removeSecureItem(`session_${key}`)
};
