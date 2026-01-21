-- Update function to show reviews if both parties have reviewed
-- OR if 14 days have passed since sale completion (even if only one party reviewed)
CREATE OR REPLACE FUNCTION get_valid_public_reviews(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  reviewer_id UUID,
  sale_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.rating,
    r.content,
    r.created_at,
    r.reviewer_id,
    r.sale_id
  FROM reviews r
  INNER JOIN sales s ON s.id = r.sale_id
  WHERE r.reviewee_id = target_user_id
    AND (
      -- Show if both parties have reviewed (original behavior)
      (
        SELECT count(*) 
        FROM reviews r2 
        WHERE r2.sale_id = r.sale_id
      ) >= 2
      -- OR if 14 days have passed since completion (even if only one reviewed)
      OR (s.completed_at IS NOT NULL AND s.completed_at < NOW() - INTERVAL '14 days')
    )
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
