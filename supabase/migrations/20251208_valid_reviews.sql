-- Function to get ONLY reviews where both parties have reviewed
-- This prevents "review bombing" or seeing a review before you've written yours
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
  WHERE r.reviewee_id = target_user_id
    -- Check that there are at least 2 reviews for this sale (buyer + seller)
    AND (
      SELECT count(*) 
      FROM reviews r2 
      WHERE r2.sale_id = r.sale_id
    ) >= 2
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
