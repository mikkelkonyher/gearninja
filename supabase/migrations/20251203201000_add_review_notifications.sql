-- Create trigger to notify the other party when a review is submitted
CREATE OR REPLACE FUNCTION notify_review_counterpart()
RETURNS TRIGGER AS $$
DECLARE
  v_sale RECORD;
  v_counterpart_id UUID;
BEGIN
  -- Get sale details
  SELECT seller_id, buyer_id, product_id INTO v_sale
  FROM sales
  WHERE id = NEW.sale_id;

  -- Determine who to notify (the person who hasn't reviewed yet)
  IF NEW.reviewer_id = v_sale.seller_id THEN
    v_counterpart_id := v_sale.buyer_id;
  ELSE
    v_counterpart_id := v_sale.seller_id;
  END IF;

  -- Create notification for the counterpart
  INSERT INTO notifications (user_id, favoriter_id, type, item_id, item_type)
  VALUES (
    v_counterpart_id,     -- Notify the other party
    NEW.reviewer_id,      -- The person who just reviewed
    'review_reminder',    -- New notification type
    v_sale.product_id,    -- The product
    'product'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_review_counterpart ON reviews;
CREATE TRIGGER trigger_notify_review_counterpart
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_review_counterpart();
