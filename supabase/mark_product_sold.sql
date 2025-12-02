-- ============================================
-- MARK PRODUCT AS SOLD FUNCTION
-- ============================================
-- Run this in Supabase SQL Editor

-- First, make favoriter_id nullable if it's not already
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'favoriter_id'
  ) THEN
    -- Make favoriter_id nullable to support product_sold notifications
    ALTER TABLE notifications 
    ALTER COLUMN favoriter_id DROP NOT NULL;
  END IF;
END $$;

-- Add sold and sold_at columns to products table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'sold'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN sold BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'sold_at'
  ) THEN
    ALTER TABLE products 
    ADD COLUMN sold_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index for sold products
CREATE INDEX IF NOT EXISTS idx_products_sold ON products(sold, sold_at);

-- Function to mark product as sold, notify favoriters (product stays for 1 day)
CREATE OR REPLACE FUNCTION mark_product_sold(product_uuid UUID, seller_uuid UUID)
RETURNS JSON AS $$
DECLARE
  product_brand VARCHAR(100);
  product_model VARCHAR(100);
  product_type VARCHAR(100);
  favoriter_record RECORD;
  notification_count INTEGER := 0;
BEGIN
  -- Verify the user owns the product
  IF NOT EXISTS (
    SELECT 1 FROM products 
    WHERE id = product_uuid AND user_id = seller_uuid AND (sold IS NULL OR sold = FALSE)
  ) THEN
    RETURN json_build_object('error', 'Product not found, you do not own this product, or it is already sold');
  END IF;

  -- Get product details for notification
  SELECT brand, model, type INTO product_brand, product_model, product_type
  FROM products
  WHERE id = product_uuid;

  -- Create notifications for all users who favorited this product
  FOR favoriter_record IN
    SELECT DISTINCT f.user_id
    FROM favorites f
    WHERE f.product_id = product_uuid
      AND f.user_id != seller_uuid
  LOOP
    INSERT INTO notifications (user_id, favoriter_id, type, item_id, item_type)
    VALUES (
      favoriter_record.user_id,
      NULL, -- No favoriter for sold notifications
      'product_sold',
      product_uuid,
      'product'
    );
    notification_count := notification_count + 1;
  END LOOP;

  -- Delete all favorites for this product
  DELETE FROM favorites WHERE product_id = product_uuid;

  -- Mark product as sold and set sold_at timestamp (will be deleted after 1 day)
  UPDATE products 
  SET sold = TRUE, sold_at = NOW()
  WHERE id = product_uuid;

  RETURN json_build_object(
    'success', true,
    'notifications_sent', notification_count,
    'product_brand', product_brand,
    'product_model', product_model,
    'product_type', product_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_product_sold(UUID, UUID) TO authenticated;

-- Function to delete products that have been sold for more than 1 day
CREATE OR REPLACE FUNCTION delete_old_sold_products()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete products that were marked as sold more than 1 day ago
  WITH deleted AS (
    DELETE FROM products
    WHERE sold = TRUE 
      AND sold_at IS NOT NULL
      AND sold_at < NOW() - INTERVAL '1 day'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_old_sold_products() TO authenticated;

-- Note: You should set up a cron job or scheduled task to run delete_old_sold_products() daily
-- In Supabase, you can use pg_cron extension or set up a scheduled Edge Function

