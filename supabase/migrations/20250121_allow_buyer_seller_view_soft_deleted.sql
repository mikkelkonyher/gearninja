-- Revert RLS Policy to only show active products in listings
-- Soft-deleted products will only be accessible via a special function for buyers/sellers

-- Drop any existing policies
DROP POLICY IF EXISTS "Anyone can view active products or own transactions" ON products;
DROP POLICY IF EXISTS "Anyone can view active products" ON products;

-- Recreate strict policy - only active products visible in normal queries
CREATE POLICY "Anyone can view active products"
  ON products
  FOR SELECT
  USING (
    COALESCE(is_soft_deleted, false) = false
  );

-- Create function to get product for transaction purposes (bypasses RLS)
-- This allows buyer/seller to access soft-deleted products for reviews
-- Drop existing function first to allow return type changes
DROP FUNCTION IF EXISTS get_product_for_transaction(UUID);

CREATE OR REPLACE FUNCTION get_product_for_transaction(p_product_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  category VARCHAR,
  type VARCHAR,
  brand VARCHAR,
  model VARCHAR,
  description TEXT,
  price NUMERIC,
  location VARCHAR,
  condition VARCHAR,
  year INTEGER,
  image_urls TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  sold BOOLEAN,
  sold_at TIMESTAMPTZ,
  is_soft_deleted BOOLEAN,
  soft_deleted_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.category,
    p.type,
    p.brand,
    p.model,
    p.description,
    p.price,
    p.location,
    p.condition,
    p.year,
    p.image_urls,
    p.created_at,
    p.updated_at,
    p.sold,
    p.sold_at,
    p.is_soft_deleted,
    p.soft_deleted_at
  FROM products p
  WHERE p.id = p_product_id
    AND (
      -- Product is not soft-deleted (anyone can see)
      COALESCE(p.is_soft_deleted, false) = false
      -- OR user is the owner (seller)
      OR p.user_id = auth.uid()
      -- OR user is the buyer
      OR EXISTS (
        SELECT 1 FROM sales s
        WHERE s.product_id = p.id
        AND s.buyer_id = auth.uid()
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
