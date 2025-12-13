-- ============================================
-- ADD SESSION_ID TO TABLES TABLE
-- ============================================
-- Adds session_id column to tables table for security
-- Session IDs are generated when table becomes occupied and invalidated when closed

ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS session_id UUID;

CREATE INDEX IF NOT EXISTS idx_tables_session_id ON tables(session_id) WHERE session_id IS NOT NULL;

-- Function to generate a new session ID
CREATE OR REPLACE FUNCTION generate_table_session_id()
RETURNS UUID AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

