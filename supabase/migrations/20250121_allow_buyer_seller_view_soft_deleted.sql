-- Update RLS Policy to allow buyer/seller to view soft-deleted products they're involved in
-- This allows them to still write reviews within the 14-day window

-- Drop the existing policy
DROP POLICY IF EXISTS "Anyone can view active products" ON products;

-- Create new policy that:
-- 1. Anyone can view active (non-soft-deleted) products
-- 2. Product owner can view their own soft-deleted products
-- 3. Buyer can view soft-deleted products they purchased
CREATE POLICY "Anyone can view active products or own transactions"
  ON products
  FOR SELECT
  USING (
    -- Non-soft-deleted products are visible to everyone
    COALESCE(is_soft_deleted, false) = false
    OR
    -- Owner can always see their own products
    user_id = auth.uid()
    OR
    -- Buyer can see products they purchased (via sales table)
    EXISTS (
      SELECT 1 FROM sales
      WHERE sales.product_id = products.id
      AND sales.buyer_id = auth.uid()
    )
  );
