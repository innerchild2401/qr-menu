-- Enable RLS on staff tables
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_category_permissions ENABLE ROW LEVEL SECURITY;

-- Staff users policies
CREATE POLICY "Staff users can only access their restaurant's data" ON staff_users
    FOR ALL USING (
        restaurant_id IN (
            SELECT restaurant_id FROM user_restaurants 
            WHERE user_id = auth.uid()
        )
    );

-- User category permissions policies
CREATE POLICY "Users can only access permissions for their restaurant's staff" ON user_category_permissions
    FOR ALL USING (
        staff_user_id IN (
            SELECT su.id FROM staff_users su
            JOIN user_restaurants ur ON su.restaurant_id = ur.restaurant_id
            WHERE ur.user_id = auth.uid()
        )
    );
