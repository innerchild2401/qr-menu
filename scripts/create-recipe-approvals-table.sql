-- Create Recipe Approvals Table
-- This table stores pending recipe changes that need admin approval

CREATE TABLE IF NOT EXISTS recipe_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    proposed_recipe JSONB NOT NULL, -- The new recipe proposed by staff
    current_recipe JSONB, -- The current recipe for comparison
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT, -- Admin can add notes when approving/rejecting
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipe_approvals_product_id ON recipe_approvals(product_id);
CREATE INDEX IF NOT EXISTS idx_recipe_approvals_staff_user_id ON recipe_approvals(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_approvals_status ON recipe_approvals(status);
CREATE INDEX IF NOT EXISTS idx_recipe_approvals_created_at ON recipe_approvals(created_at);

-- Enable Row Level Security
ALTER TABLE recipe_approvals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Restaurant owners can view approvals for their products
CREATE POLICY "Restaurant owners can view recipe approvals" ON recipe_approvals
    FOR SELECT USING (
        product_id IN (
            SELECT p.id 
            FROM products p
            JOIN restaurants r ON r.id = p.restaurant_id
            WHERE r.owner_id = auth.uid()
        )
    );

-- Restaurant owners can update approvals (approve/reject)
CREATE POLICY "Restaurant owners can update recipe approvals" ON recipe_approvals
    FOR UPDATE USING (
        product_id IN (
            SELECT p.id 
            FROM products p
            JOIN restaurants r ON r.id = p.restaurant_id
            WHERE r.owner_id = auth.uid()
        )
    );

-- Staff users can view their own pending approvals
CREATE POLICY "Staff users can view own pending approvals" ON recipe_approvals
    FOR SELECT USING (
        staff_user_id IN (
            SELECT su.id 
            FROM staff_users su
            WHERE su.restaurant_id IN (
                SELECT ur.restaurant_id 
                FROM user_restaurants ur
                WHERE ur.user_id = auth.uid()
            )
        )
    );
