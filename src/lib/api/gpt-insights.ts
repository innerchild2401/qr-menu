import { authenticatedApiCall, authenticatedApiCallWithBody } from '../api-helpers';

export interface APIFixedCost {
  label: string;
  amount: number;
  isPercentage: boolean;
  category: 'fixed' | 'percentage';
}

export interface GPTInsightRequest {
  fixedCosts: APIFixedCost[];
  restaurantId: string;
  userCountry?: string;
}

export interface NormalizedIngredient {
  name: string;
  normalizedName: string;
  needsNormalization: boolean;
}

export interface PriceCheck {
  ingredient: string;
  currentPrice?: number;
  onlinePrice?: number;
  priceDifference?: number;
  source: string;
  lastUpdated: string;
}

export interface BreakEvenAnalysis {
  menuItem: string;
  currentPrice: number;
  estimatedCOGS: number;
  breakevenPrice: number;
  profitMargin: number;
  isProfitable: boolean;
  recommendations: string[];
}

export interface ProfitabilitySuggestion {
  menuItem: string;
  currentProfit: number;
  suggestedPrice: number;
  expectedProfitIncrease: number;
  reasoning: string;
  comboSuggestions: string[];
}

export interface UpsellIdea {
  menuItem: string;
  upsellItem: string;
  additionalRevenue: number;
  reasoning: string;
  implementation: string;
}

export interface MarketingPopup {
  title: string;
  message: string;
  targetItems: string[];
  timing: string;
  expectedImpact: string;
}

export interface CategoryOptimization {
  currentOrder: string[];
  suggestedOrder: string[];
  reasoning: string;
  expectedRevenueIncrease: number;
}

export interface UnavailableItem {
  name: string;
  reason: string;
  suggestedAlternatives: string[];
  impact: 'high' | 'medium' | 'low';
}

export interface InsightFolder {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  data: GPTInsightResponse;
  isExpanded: boolean;
}

export interface GPTInsightResponse {
  normalizedIngredients: NormalizedIngredient[];
  priceCheck: PriceCheck[];
  breakEvenAnalysis: BreakEvenAnalysis[];
  profitabilitySuggestions: ProfitabilitySuggestion[];
  upsellIdeas: UpsellIdea[];
  marketingPopups: MarketingPopup[];
  categoryOptimization: CategoryOptimization;
  unavailableItems: UnavailableItem[];
  summary: string;
  generatedAt: string;
}

export async function generateRestaurantInsights(
  request: GPTInsightRequest
): Promise<GPTInsightResponse> {
  try {
    const systemPrompt = `You are an AI financial analyst for restaurants. 
Perform these tasks:
1. Ensure all ingredients are normalized in the database (return a list if not).
2. Fetch online prices for ingredients (use user IP country: ${request.userCountry || 'US'}).
3. Cost out each menu item and analyze:
   - Breakeven analysis (median COGS vs asking price).
   - Profitability insights and combo suggestions.
   - Upselling ideas and pop-up marketing suggestions.
   - Category/product rearrangement for profit optimization.
   - Note if menu item is currently unavailable.

Return structured JSON:
{
  "normalizedIngredients": [...],
  "priceCheck": [...],
  "breakEvenAnalysis": [...],
  "profitabilitySuggestions": [...],
  "upsellIdeas": [...],
  "marketingPopups": [...],
  "categoryOptimization": {...},
  "unavailableItems": [...],
  "summary": "Human-friendly summary of key insights and recommendations"
}

Fixed costs provided:
${request.fixedCosts.map(cost => 
  `- ${cost.label}: ${cost.isPercentage ? `${cost.amount}%` : `$${cost.amount.toLocaleString()}`}`
).join('\n')}

Provide actionable, data-driven insights that will help optimize restaurant profitability.`;

    const response = await authenticatedApiCallWithBody('/api/generate-insights', {
      systemPrompt,
      restaurantId: request.restaurantId,
      fixedCosts: request.fixedCosts,
      userCountry: request.userCountry,
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate insights');
    }

    return data.data as GPTInsightResponse;
  } catch (error) {
    console.error('Error generating insights:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Failed to generate insights. Please try again.'
    );
  }
}

export async function saveInsightFolder(
  insight: GPTInsightResponse,
  restaurantId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const response = await authenticatedApiCallWithBody('/api/admin/insights', {
      restaurantId,
      insight,
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving insight folder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save insight folder',
    };
  }
}

export async function getInsightFolders(
  restaurantId: string
): Promise<{ success: boolean; data?: InsightFolder[]; error?: string }> {
  try {
    const response = await authenticatedApiCall(`/api/admin/insights?restaurantId=${restaurantId}`);

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching insight folders:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch insight folders',
    };
  }
}
