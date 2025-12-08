-- Function to get sold products for a user, bypassing soft delete check
-- This allows the profile page to show a history of all sold items
CREATE OR REPLACE FUNCTION get_user_sold_products(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  brand TEXT,
  model TEXT,
  type TEXT,
  price NUMERIC,
  image_urls TEXT[],
  sold_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.brand,
    p.model,
    p.type,
    p.price,
    p.image_urls,
    p.sold_at
  FROM products p
  WHERE p.user_id = target_user_id
    AND p.sold = TRUE
  ORDER BY p.sold_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
