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

export interface StrategicRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
  targetItems: string[];
  expectedImpact: string;
  timeline: string;
  resources: string;
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
  strategicRecommendations: StrategicRecommendation[];
  unavailableItems: UnavailableItem[];
  summary: string;
  generatedAt: string;
}

export async function generateRestaurantInsights(
  request: GPTInsightRequest
): Promise<GPTInsightResponse> {
  try {
    const systemPrompt = `You are an AI restaurant strategy consultant and financial analyst. 
Analyze ALL provided menu items and generate highly actionable, strategic insights for restaurant optimization.

CRITICAL: You must analyze EVERY SINGLE product in the menu data provided. Do not skip any products.

FOCUS ON ACTIONABLE STRATEGY:
- Which products to PUSH (high margin, popular, seasonal)
- Which products to PAIR together (complementary items, cross-selling)
- Which products to PROMOTE (underperforming but high potential)
- Which products to PRICE ADJUST (over/under priced based on market)
- Which products to POSITION differently (menu placement, descriptions)
- Which products to PARTNER with suppliers (bulk discounts, exclusivity)

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
    {"menuItem": "Item Name", "action": "PUSH/PAIR/PROMOTE/PRICE/POSITION", "reasoning": "strategic reasoning", "expectedProfitIncrease": 15.50, "suggestedCombo": ["Side 1", "Side 2"], "implementation": "specific steps to take"}
  ],
  "upsellIdeas": [
    {"menuItem": "Main Item", "upsellItem": "Add-on suggestion", "additionalRevenue": 3.50, "reasoning": "why this works", "implementation": "exact steps for staff", "timing": "when to suggest", "targetCustomer": "who to target"}
  ],
  "marketingPopups": [
    {"title": "Campaign Title", "message": "specific popup text", "targetItems": ["item1", "item2"], "timing": "exact timing", "expectedImpact": "specific revenue increase", "implementation": "how to set up"}
  ],
  "categoryOptimization": {
    "currentOrder": ["category1", "category2"],
    "suggestedOrder": ["category2", "category1"],
    "reasoning": "why reorder helps",
    "expectedRevenueIncrease": 12.5
  },
  "unavailableItems": ["item name 1", "item name 2"],
  "strategicRecommendations": [
    {"priority": "HIGH/MEDIUM/LOW", "action": "specific action", "targetItems": ["item1", "item2"], "expectedImpact": "revenue/profit increase", "timeline": "when to implement", "resources": "what you need"}
  ],
  "summary": "Human-friendly summary of key insights and recommendations"
}

IMPORTANT: 
- breakEvenAnalysis must include EVERY product from the menu data
- Calculate monthlyBreakEvenUnits for each product: monthlyBreakEvenUnits = totalFixedCosts / contributionMargin
- contributionMargin = price - cogs
- profitabilitySuggestions must specify ACTION (PUSH/PAIR/PROMOTE/PRICE/POSITION) and implementation steps
- upsellIdeas must include timing, target customer, and exact staff instructions
- marketingPopups must have specific popup text and implementation details
- strategicRecommendations must be prioritized and include timelines
- All numeric values should be actual numbers, not strings
- Provide SPECIFIC, ACTIONABLE insights that restaurant owners can implement immediately
- Focus on revenue optimization, cost reduction, and customer experience improvements
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
): Promise<{ success: boolean; data?: { id: string; title: string; summary: string; createdAt: string; data: GPTInsightResponse }; error?: string }> {
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
