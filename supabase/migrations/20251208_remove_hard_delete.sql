-- Remove hard delete logic from handle_product_lifecycle function
-- Now it only performs soft delete after 3 days, no permanent deletion

CREATE OR REPLACE FUNCTION handle_product_lifecycle()
RETURNS JSON AS $$
DECLARE
  soft_deleted_count INTEGER;
BEGIN
  -- Soft Delete: Sold > 3 days ago
  WITH soft_deleted AS (
    UPDATE products
    SET is_soft_deleted = TRUE, soft_deleted_at = NOW()
    WHERE sold = TRUE 
      AND sold_at < NOW() - INTERVAL '3 days'
      AND (is_soft_deleted = FALSE OR is_soft_deleted IS NULL)
    RETURNING id
  )
  SELECT COUNT(*) INTO soft_deleted_count FROM soft_deleted;

  RETURN json_build_object(
    'soft_deleted', soft_deleted_count,
    'hard_deleted', 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
