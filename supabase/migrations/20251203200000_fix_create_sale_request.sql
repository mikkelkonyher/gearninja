-- Update create_sale_request function to handle existing sales
CREATE OR REPLACE FUNCTION create_sale_request(p_product_id UUID, p_buyer_id UUID)
RETURNS JSON AS $$
DECLARE
  v_seller_id UUID;
  v_sale_id UUID;
  v_existing_sale_id UUID;
BEGIN
  -- Get seller_id from product and verify ownership
  SELECT user_id INTO v_seller_id
  FROM products
  WHERE id = p_product_id;

  IF v_seller_id IS NULL THEN
    RETURN json_build_object('error', 'Product not found');
  END IF;

  IF v_seller_id != auth.uid() THEN
    RETURN json_build_object('error', 'You do not own this product');
  END IF;

  -- Check if a sale already exists for this product
  SELECT id INTO v_existing_sale_id
  FROM sales
  WHERE product_id = p_product_id;

  IF v_existing_sale_id IS NOT NULL THEN
    -- Delete the existing sale and create a new one
    DELETE FROM sales WHERE id = v_existing_sale_id;
  END IF;

  -- Create sale record
  INSERT INTO sales (product_id, seller_id, buyer_id, status)
  VALUES (p_product_id, v_seller_id, p_buyer_id, 'pending')
  RETURNING id INTO v_sale_id;

  -- Mark product as sold
  UPDATE products 
  SET sold = TRUE, sold_at = NOW()
  WHERE id = p_product_id;
  
  -- Clear favorites
  DELETE FROM favorites WHERE product_id = p_product_id;

  -- Create notification for buyer
  INSERT INTO notifications (user_id, favoriter_id, type, item_id, item_type)
  VALUES (
    p_buyer_id,
    v_seller_id,
    'sale_request',
    p_product_id,
    'product'
  );

  RETURN json_build_object('success', true, 'sale_id', v_sale_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
