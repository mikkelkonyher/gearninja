-- Update the handle_soft_deletions function to only soft-delete products
-- where the associated sale has been completed (not pending or cancelled)
CREATE OR REPLACE FUNCTION handle_soft_deletions()
RETURNS void AS $$
BEGIN
  UPDATE products p
  SET is_soft_deleted = true,
      soft_deleted_at = NOW()
  WHERE p.sold = true
    AND p.sold_at < (NOW() - INTERVAL '3 days')
    AND (p.is_soft_deleted = false OR p.is_soft_deleted IS NULL)
    -- Only delete if the sale is completed
    AND EXISTS (
      SELECT 1 FROM sales s
      WHERE s.product_id = p.id
        AND s.status = 'completed'
    );
END;
$$ LANGUAGE plpgsql;
