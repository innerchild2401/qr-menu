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
  monthlyBreakEvenUnits: number;
  cogs: number;
  price: number;
  contributionMargin: number;
  reasoning: string;
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
Analyze ALL provided menu items and generate actionable insights for each product.

CRITICAL: You must analyze EVERY SINGLE product in the menu data provided. Do not skip any products.

REQUIRED JSON STRUCTURE:
{
  "normalizedIngredients": [
    {"ingredient": "ingredient name", "normalized": "normalized name", "quantity": "amount", "category": "category"}
  ],
  "priceCheck": [
    {"ingredient": "ingredient name", "price": 4.50, "source": "online source"}
  ],
  "breakEvenAnalysis": [
    {"menuItem": "Item Name", "monthlyBreakEvenUnits": 45, "cogs": 8.50, "price": 12.00, "contributionMargin": 3.50, "reasoning": "explanation"}
  ],
  "profitabilitySuggestions": [
    {"menuItem": "Item Name", "reasoning": "why this combo works", "expectedProfitIncrease": 15.50, "suggestedCombo": ["Side 1", "Side 2"]}
  ],
  "upsellIdeas": [
    {"menuItem": "Main Item", "upsellItem": "Add-on suggestion", "additionalRevenue": 3.50, "reasoning": "why this works", "implementation": "how to implement"}
  ],
  "marketingPopups": [
    {"title": "Campaign Title", "message": "Popup message", "targetItems": ["item1", "item2"], "timing": "when to show", "expectedImpact": "expected result"}
  ],
  "categoryOptimization": {
    "currentOrder": ["category1", "category2"],
    "suggestedOrder": ["category2", "category1"],
    "reasoning": "why reorder helps",
    "expectedRevenueIncrease": 12.5
  },
  "unavailableItems": ["item name 1", "item name 2"],
  "summary": "Human-friendly summary of key insights and recommendations"
}

IMPORTANT: 
- breakEvenAnalysis must include EVERY product from the menu data
- Calculate monthlyBreakEvenUnits for each product: monthlyBreakEvenUnits = totalFixedCosts / contributionMargin
- contributionMargin = price - cogs
- profitabilitySuggestions must have menuItem, reasoning, expectedProfitIncrease fields  
- upsellIdeas must have menuItem, upsellItem, additionalRevenue fields
- marketingPopups must have title, message, targetItems fields
- All numeric values should be actual numbers, not strings
- Provide realistic, actionable insights based on ALL menu data provided
- Do not limit analysis to only a few products - analyze everything

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
