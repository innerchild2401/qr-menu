/**
 * Client Tracking Utilities
 * Handles client persistence and visit tracking
 */

const CLIENT_TOKEN_KEY = 'smartmenu_client_token';
const CLIENT_FINGERPRINT_KEY = 'smartmenu_client_fingerprint';

/**
 * Generate or retrieve client token from localStorage
 */
export function getOrCreateClientToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  let token = localStorage.getItem(CLIENT_TOKEN_KEY);
  
  if (!token) {
    // Generate a new UUID-like token
    token = `client_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(CLIENT_TOKEN_KEY, token);
  }

  return token;
}

/**
 * Get client token (returns empty string if not exists)
 */
export function getClientToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(CLIENT_TOKEN_KEY);
}

/**
 * Generate browser fingerprint (simplified version)
 */
export function generateClientFingerprint(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  // Check if we already have a fingerprint
  let fingerprint = localStorage.getItem(CLIENT_FINGERPRINT_KEY);
  if (fingerprint) {
    return fingerprint;
  }

  // Generate fingerprint from available browser data
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || '',
  ];

  // Simple hash function
  const hash = components.join('|');
  fingerprint = btoa(hash).substring(0, 32); // Base64 encode and truncate
  
  localStorage.setItem(CLIENT_FINGERPRINT_KEY, fingerprint);
  return fingerprint;
}

/**
 * Track a visit to the restaurant
 */
export async function trackVisit(
  restaurantId: string,
  tableId?: string,
  areaId?: string,
  campaign?: string
): Promise<void> {
  try {
    const clientToken = getOrCreateClientToken();
    const fingerprint = generateClientFingerprint();

    // Extract URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const qrTableId = urlParams.get('table');
    const qrAreaId = urlParams.get('area');
    const qrCampaign = urlParams.get('campaign');

    // Use URL params if provided, otherwise use function params
    const finalTableId = qrTableId || tableId;
    const finalAreaId = qrAreaId || areaId;
    const finalCampaign = qrCampaign || campaign;

    // Determine QR code type
    let qrCodeType: 'table' | 'area' | 'general' | 'campaign' = 'general';
    if (finalTableId) {
      qrCodeType = 'table';
    } else if (finalAreaId) {
      qrCodeType = 'area';
    } else if (finalCampaign) {
      qrCodeType = 'campaign';
    }

    // Collect device info
    const deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: navigator.platform,
    };

    // Send visit tracking to API
    const response = await fetch('/api/crm/track-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId,
        clientToken,
        clientFingerprint: fingerprint,
        tableId: finalTableId,
        areaId: finalAreaId,
        campaign: finalCampaign,
        qrCodeType,
        deviceInfo,
        referrer: document.referrer || undefined,
      }),
    });

    if (!response.ok) {
      console.error('Failed to track visit:', await response.text());
    }
  } catch (error) {
    console.error('Error tracking visit:', error);
    // Don't throw - tracking failures shouldn't break the app
  }
}

/**
 * Track a customer event (product view, add to cart, etc.)
 */
export async function trackEvent(
  restaurantId: string,
  eventType: string,
  eventData?: Record<string, unknown>
): Promise<void> {
  try {
    const clientToken = getClientToken();
    if (!clientToken) {
      return; // Can't track without client token
    }

    // Extract table/area from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const tableId = urlParams.get('table') || undefined;
    const areaId = urlParams.get('area') || undefined;

    await fetch('/api/crm/track-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId,
        clientToken,
        eventType,
        eventData,
        tableId,
        areaId,
      }),
    });
  } catch (error) {
    console.error('Error tracking event:', error);
    // Don't throw - tracking failures shouldn't break the app
  }
}

/**
 * Get WhatsApp order URL with token
 */
export async function getWhatsAppOrderUrl(
  restaurantId: string,
  orderData: {
    items: Array<{ product_id: string; quantity: number; price: number; name: string }>;
    subtotal: number;
    total: number;
  },
  tableId?: string,
  areaId?: string,
  orderType: 'dine_in' | 'delivery' = 'dine_in',
  campaign?: string
): Promise<string> {
  try {
    const clientToken = getClientToken();
    
    // Create WhatsApp order token
    const response = await fetch('/api/crm/whatsapp/create-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        restaurantId,
        clientToken,
        orderData,
        tableId,
        areaId,
        orderType,
        campaign,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create WhatsApp token');
    }

    const { token, whatsappNumber } = await response.json();

    // Construct WhatsApp URL with prefilled message
    // Keep message short - just the token
    const message = `Order: ${token}`;
    const encodedMessage = encodeURIComponent(message);
    
    // Use WhatsApp Business API format
    // Format: https://wa.me/{phone}?text={message}
    return `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
  } catch (error) {
    console.error('Error creating WhatsApp order URL:', error);
    throw error;
  }
}

