-- Create Staff Helper Functions
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
