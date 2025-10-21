-- Setup Staff Management System
-- This script creates all necessary tables and functions for staff management

-- 1. Create Staff Users Table
CREATE TABLE IF NOT EXISTS staff_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    pin TEXT NOT NULL, -- Hashed PIN
    role TEXT NOT NULL CHECK (role IN ('cook', 'bartender', 'server', 'manager')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(restaurant_id, pin)
);

-- 2. Create User Category Permissions Table
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

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_users_restaurant_id ON staff_users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_is_active ON staff_users(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_users_role ON staff_users(role);
CREATE INDEX IF NOT EXISTS idx_user_category_permissions_staff_user_id ON user_category_permissions(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_permissions_category_id ON user_category_permissions(category_id);

-- 4. Create helper functions
CREATE OR REPLACE FUNCTION hash_pin(pin TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(pin, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION verify_pin(pin TEXT, hashed_pin TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hashed_pin = crypt(pin, hashed_pin);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_categories(user_id UUID)
RETURNS TABLE(category_id BIGINT, can_edit BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT ucp.category_id, ucp.can_edit
    FROM user_category_permissions ucp
    WHERE ucp.staff_user_id = user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION can_user_edit_category(user_id UUID, category_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM user_category_permissions ucp
        WHERE ucp.staff_user_id = user_id 
        AND ucp.category_id = category_id 
        AND ucp.can_edit = true
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Enable RLS
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_category_permissions ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "Staff users can only access their restaurant's data" ON staff_users
    FOR ALL USING (
        restaurant_id IN (
            SELECT restaurant_id FROM user_restaurants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only access permissions for their restaurant's staff" ON user_category_permissions
    FOR ALL USING (
        staff_user_id IN (
            SELECT su.id FROM staff_users su
            JOIN user_restaurants ur ON su.restaurant_id = ur.restaurant_id
            WHERE ur.user_id = auth.uid()
        )
    );

-- Success message
SELECT 'Staff management system setup complete!' as message;
