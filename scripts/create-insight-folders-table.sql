-- Create insight_folders table for storing AI-generated restaurant insights
CREATE TABLE IF NOT EXISTS insight_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_insight_folders_restaurant_id ON insight_folders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_insight_folders_created_at ON insight_folders(created_at DESC);

-- Add RLS policies
ALTER TABLE insight_folders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access insight folders for their own restaurants
CREATE POLICY "Users can access their own restaurant insight folders" ON insight_folders
  FOR ALL USING (
    restaurant_id IN (
      SELECT id FROM restaurants WHERE owner_id = auth.uid()
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

CREATE TRIGGER update_insight_folders_updated_at 
  BEFORE UPDATE ON insight_folders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
