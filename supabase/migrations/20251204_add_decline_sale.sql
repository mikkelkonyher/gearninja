-- Add decline_sale function to allow buyers to decline sale requests
CREATE OR REPLACE FUNCTION decline_sale(p_sale_id UUID)
RETURNS JSON AS $$
DECLARE
  v_sale RECORD;
BEGIN
  -- Get sale details
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;
  
  IF v_sale IS NULL THEN
    RETURN json_build_object('error', 'Sale not found');
  END IF;
  
  IF v_sale.buyer_id != auth.uid() THEN
    RETURN json_build_object('error', 'You are not the buyer');
  END IF;
  
  -- Only allow declining pending sales
  IF v_sale.status != 'pending' THEN
    RETURN json_build_object('error', 'Can only decline pending sales');
  END IF;
  
  -- Unmark product as sold
  UPDATE products 
  SET sold = FALSE, sold_at = NULL
  WHERE id = v_sale.product_id;
  
  -- Notify seller that buyer declined
  INSERT INTO notifications (user_id, favoriter_id, type, item_id, item_type)
  VALUES (
    v_sale.seller_id,      -- Notify the seller
    v_sale.buyer_id,       -- The buyer who declined
    'sale_declined',       -- New notification type
    v_sale.product_id,     -- The product
    'product'
  );
  
  -- Delete the sale record
  DELETE FROM sales WHERE id = p_sale_id;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
