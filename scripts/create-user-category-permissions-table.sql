-- Create User Category Permissions Table
CREATE TABLE IF NOT EXISTS user_category_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
    category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    can_edit BOOLEAN DEFAULT true,
    can_view BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(staff_user_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_category_permissions_staff_user_id ON user_category_permissions(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_permissions_category_id ON user_category_permissions(category_id);
