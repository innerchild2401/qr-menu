-- ============================================
-- TABLE APPROVAL SYSTEM
-- ============================================
-- Allows multiple customers at a table, with approval required for subsequent users

-- Table approval requests
CREATE TABLE IF NOT EXISTS table_approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  requester_token TEXT NOT NULL, -- customer_token of the person requesting access
  requester_fingerprint TEXT, -- browser fingerprint for identification
  status TEXT DEFAULT 'pending', -- pending, approved, denied, expired
  approved_by_token TEXT, -- customer_token of the person who approved/denied
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 20 seconds from creation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Partial unique index: Only one pending request per customer per table
CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_requests_unique_pending 
ON table_approval_requests(table_id, requester_token) 
WHERE status = 'pending';

CREATE INDEX idx_approval_requests_table ON table_approval_requests(table_id, status) WHERE status = 'pending';
CREATE INDEX idx_approval_requests_requester ON table_approval_requests(requester_token, status) WHERE status = 'pending';
CREATE INDEX idx_approval_requests_expires ON table_approval_requests(expires_at) WHERE status = 'pending';

-- Table participants (track who has access to add items)
CREATE TABLE IF NOT EXISTS table_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_token TEXT NOT NULL, -- customer_token of the participant
  customer_fingerprint TEXT, -- browser fingerprint
  is_first_scanner BOOLEAN DEFAULT false, -- First person to scan doesn't need approval
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(table_id, customer_token) -- One entry per customer per table
);

CREATE INDEX idx_table_participants_table ON table_participants(table_id);
CREATE INDEX idx_table_participants_token ON table_participants(customer_token);
CREATE INDEX idx_table_participants_active ON table_participants(table_id, last_active_at);

-- Approval audit log (for compliance and debugging)
CREATE TABLE IF NOT EXISTS table_approval_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  approval_request_id UUID REFERENCES table_approval_requests(id) ON DELETE SET NULL,
  requester_token TEXT NOT NULL,
  approver_token TEXT, -- NULL if auto-expired or system action
  action TEXT NOT NULL, -- requested, approved, denied, expired, auto_approved_first
  reason TEXT, -- Optional reason for deny
  metadata JSONB, -- Additional context (items being added, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_approval_audit_table ON table_approval_audit(table_id, created_at);
CREATE INDEX idx_approval_audit_requester ON table_approval_audit(requester_token, created_at);
CREATE INDEX idx_approval_audit_approver ON table_approval_audit(approver_token, created_at);

-- Function to clean up expired requests (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_approval_requests()
RETURNS void AS $$
BEGIN
  UPDATE table_approval_requests
  SET status = 'expired', resolved_at = NOW()
  WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

