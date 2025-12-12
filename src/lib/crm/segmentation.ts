/**
 * Customer Segmentation Logic
 * Automatically assigns customer segments based on behavior
 */

export type CustomerSegment = 'VIP' | 'Regular' | 'Occasional' | 'Rare' | 'Lost';

export interface SegmentationInput {
  total_visits: number;
  total_spent: number;
  last_seen_at?: string;
  first_seen_at?: string;
  average_order_value?: number;
}

/**
 * Calculate customer segment based on behavior
 */
export function calculateCustomerSegment(input: SegmentationInput): CustomerSegment {
  const { total_visits, total_spent, last_seen_at, first_seen_at, average_order_value } = input;

  // Check if customer is lost (no visit in 6+ months)
  if (last_seen_at) {
    const lastSeen = new Date(last_seen_at);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    if (lastSeen < sixMonthsAgo) {
      return 'Lost';
    }
  }

  // Calculate days since first visit
  let daysSinceFirstVisit = 30; // Default to 30 days if unknown
  if (first_seen_at) {
    const firstSeen = new Date(first_seen_at);
    const now = new Date();
    daysSinceFirstVisit = Math.max(1, Math.floor((now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)));
  }

  // Calculate visit frequency (visits per month)
  const visitsPerMonth = total_visits / (daysSinceFirstVisit / 30);

  // VIP: High visits (2+ per month) AND high spending (top tier)
  if (visitsPerMonth >= 2 && total_spent >= 500) {
    return 'VIP';
  }

  // Regular: Good visit frequency (1+ per month) OR good spending
  if (visitsPerMonth >= 1 || total_spent >= 200) {
    return 'Regular';
  }

  // Occasional: Some visits but not frequent
  if (total_visits >= 2) {
    return 'Occasional';
  }

  // Rare: Only 1 visit or very low activity
  return 'Rare';
}

/**
 * Calculate customer status (active, at-risk, lost)
 */
export function calculateCustomerStatus(last_seen_at?: string): 'active' | 'at-risk' | 'lost' {
  if (!last_seen_at) {
    return 'active';
  }

  const lastSeen = new Date(last_seen_at);
  const now = new Date();
  const daysSinceLastVisit = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastVisit > 180) {
    return 'lost';
  } else if (daysSinceLastVisit > 90) {
    return 'at-risk';
  } else {
    return 'active';
  }
}

/**
 * Update customer segment and status
 */
export async function updateCustomerSegmentation(
  customerId: string,
  customerData: SegmentationInput & { first_seen_at?: string }
) {
  const segment = calculateCustomerSegment(customerData);
  const status = calculateCustomerStatus(customerData.last_seen_at);

  return {
    customer_segment: segment,
    status,
  };
}

