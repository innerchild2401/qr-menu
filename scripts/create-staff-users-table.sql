-- Create Staff Users Table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_users_restaurant_id ON staff_users(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_is_active ON staff_users(is_active);
CREATE INDEX IF NOT EXISTS idx_staff_users_role ON staff_users(role);
