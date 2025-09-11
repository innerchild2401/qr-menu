-- Create token_consumption table for tracking GPT API usage
CREATE TABLE IF NOT EXISTS token_consumption (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  api_endpoint TEXT NOT NULL,
  request_id TEXT,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  prompt_cost_usd DECIMAL(10, 8) NOT NULL DEFAULT 0,
  completion_cost_usd DECIMAL(10, 8) NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(10, 8) NOT NULL DEFAULT 0,
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_token_consumption_user_id ON token_consumption(user_id);
CREATE INDEX IF NOT EXISTS idx_token_consumption_user_email ON token_consumption(user_email);
CREATE INDEX IF NOT EXISTS idx_token_consumption_created_at ON token_consumption(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_consumption_api_endpoint ON token_consumption(api_endpoint);

-- Add RLS policies
ALTER TABLE token_consumption ENABLE ROW LEVEL SECURITY;

-- Policy: Only afilip.mme@gmail.com can access all token consumption data
CREATE POLICY "Only admin can access token consumption data" ON token_consumption
  FOR ALL USING (
    user_email = 'afilip.mme@gmail.com' OR
    user_id IN (
      SELECT id FROM users WHERE email = 'afilip.mme@gmail.com'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create pricing configuration table for easy updates
CREATE TABLE IF NOT EXISTS token_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  model TEXT NOT NULL UNIQUE,
  prompt_token_cost_usd DECIMAL(10, 8) NOT NULL,
  completion_token_cost_usd DECIMAL(10, 8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default pricing for GPT-4o-mini
INSERT INTO token_pricing (model, prompt_token_cost_usd, completion_token_cost_usd)
VALUES ('gpt-4o-mini', 0.00000015, 0.00000060)
ON CONFLICT (model) DO UPDATE SET
  prompt_token_cost_usd = EXCLUDED.prompt_token_cost_usd,
  completion_token_cost_usd = EXCLUDED.completion_token_cost_usd,
  updated_at = NOW();

-- Enable RLS for pricing table
ALTER TABLE token_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: Only admin can access pricing data
CREATE POLICY "Only admin can access pricing data" ON token_pricing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE email = 'afilip.mme@gmail.com' AND id = auth.uid()
    )
  );
