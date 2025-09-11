import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface TokenConsumptionData {
  userId: string;
  userEmail: string;
  apiEndpoint: string;
  requestId?: string;
  usage: TokenUsage;
  model: string;
}

// GPT-4o-mini pricing (per token)
const PRICING = {
  'gpt-4o-mini': {
    prompt: 0.00000015,    // $0.00000015 per prompt token
    completion: 0.00000060  // $0.00000060 per completion token
  }
};

export async function trackTokenConsumption(data: TokenConsumptionData): Promise<void> {
  try {
    const pricing = PRICING[data.model as keyof typeof PRICING] || PRICING['gpt-4o-mini'];
    
    const promptCost = data.usage.prompt_tokens * pricing.prompt;
    const completionCost = data.usage.completion_tokens * pricing.completion;
    const totalCost = promptCost + completionCost;

    const consumptionRecord = {
      user_id: data.userId,
      user_email: data.userEmail,
      api_endpoint: data.apiEndpoint,
      request_id: data.requestId || null,
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens,
      prompt_cost_usd: promptCost,
      completion_cost_usd: completionCost,
      total_cost_usd: totalCost,
      model: data.model
    };

    const { error } = await supabase
      .from('token_consumption')
      .insert(consumptionRecord);

    if (error) {
      console.error('Failed to track token consumption:', error);
      // Don't throw error to avoid breaking the main API call
    }
  } catch (error) {
    console.error('Error tracking token consumption:', error);
    // Don't throw error to avoid breaking the main API call
  }
}

export function extractTokenUsageFromResponse(response: { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }): TokenUsage {
  // Extract token usage from OpenAI API response
  const usage = response.usage || {};
  return {
    prompt_tokens: usage.prompt_tokens || 0,
    completion_tokens: usage.completion_tokens || 0,
    total_tokens: usage.total_tokens || 0
  };
}
