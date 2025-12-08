-- Function to handle soft deletions for products sold more than 3 days ago
CREATE OR REPLACE FUNCTION handle_soft_deletions()
RETURNS void AS $$
BEGIN
  UPDATE products
  SET is_soft_deleted = true,
      soft_deleted_at = NOW()
  WHERE sold = true
    AND sold_at < (NOW() - INTERVAL '3 days')
    AND (is_soft_deleted = false OR is_soft_deleted IS NULL);
END;
$$ LANGUAGE plpgsql;

-- Attempt to schedule the job with pg_cron if available (Optional, will fail silently if extension not present or no permissions)
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule the job directly
SELECT cron.schedule('handle_soft_deletions_hourly', '0 * * * *', 'SELECT handle_soft_deletions()');

-- Update RLS Policy to hide soft-deleted products from public view
-- First, drop the existing permissive policy
DROP POLICY IF EXISTS "Anyone can view products" ON products;

-- Create a new policy that only shows active products to the public,
-- but allows owners to see their own soft-deleted products.
DROP POLICY IF EXISTS "Anyone can view active products" ON products;
CREATE POLICY "Anyone can view active products"
  ON products
  FOR SELECT
  USING (
    COALESCE(is_soft_deleted, false) = false
  );
