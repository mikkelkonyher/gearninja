-- Add soft delete columns to products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_soft_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS soft_deleted_at TIMESTAMP WITH TIME ZONE;

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(product_id) -- One active sale per product
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sale_id, reviewer_id) -- One review per person per sale
);

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Users can view sales they are part of" ON sales;
DROP POLICY IF EXISTS "Sellers can create sales" ON sales;
DROP POLICY IF EXISTS "Buyers can update sales (confirm)" ON sales;
DROP POLICY IF EXISTS "Users can view reviews for sales they are part of" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews for their sales" ON reviews;

-- Sales Policies
CREATE POLICY "Users can view sales they are part of"
  ON sales FOR SELECT
  USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

CREATE POLICY "Sellers can create sales"
  ON sales FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Buyers can update sales (confirm)"
  ON sales FOR UPDATE
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

-- Reviews Policies
CREATE POLICY "Users can view reviews for sales they are part of"
  ON reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE sales.id = reviews.sale_id 
      AND (sales.seller_id = auth.uid() OR sales.buyer_id = auth.uid())
    )
  );

CREATE POLICY "Users can create reviews for their sales"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM sales 
      WHERE sales.id = reviews.sale_id 
      AND (sales.seller_id = auth.uid() OR sales.buyer_id = auth.uid())
    )
  );

-- Function to create sale request
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

  -- Mark product as sold using existing logic (or update directly if mark_product_sold is not used here)
  -- We'll call the update directly to ensure atomicity with this transaction
  UPDATE products 
  SET sold = TRUE, sold_at = NOW()
  WHERE id = p_product_id;
  
  -- Also clear favorites (logic from mark_product_sold)
  DELETE FROM favorites WHERE product_id = p_product_id;

  -- Create notification for buyer
  INSERT INTO notifications (user_id, favoriter_id, type, item_id, item_type)
  VALUES (
    p_buyer_id,           -- Notify the buyer
    v_seller_id,          -- The seller who selected them
    'sale_request',       -- New notification type
    p_product_id,         -- The product being sold
    'product'
  );

  RETURN json_build_object('success', true, 'sale_id', v_sale_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to confirm sale
CREATE OR REPLACE FUNCTION confirm_sale(p_sale_id UUID)
RETURNS JSON AS $$
DECLARE
  v_sale RECORD;
BEGIN
  SELECT * INTO v_sale FROM sales WHERE id = p_sale_id;

  IF v_sale IS NULL THEN
    RETURN json_build_object('error', 'Sale not found');
  END IF;

  IF v_sale.buyer_id != auth.uid() THEN
    RETURN json_build_object('error', 'You are not the buyer');
  END IF;

  UPDATE sales
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_sale_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get potential buyers (people with chats)
CREATE OR REPLACE FUNCTION get_product_buyers(p_product_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    u.id,
    COALESCE(u.raw_user_meta_data->>'username', u.email) as username,
    u.raw_user_meta_data->>'avatar_url' as avatar_url
  FROM chats c
  JOIN auth.users u ON (c.buyer_id = u.id OR c.seller_id = u.id)
  WHERE c.item_id = p_product_id 
    AND c.item_type = 'product'
    AND u.id != auth.uid(); -- Exclude current user (seller)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle product lifecycle (Soft/Hard Delete)
CREATE OR REPLACE FUNCTION handle_product_lifecycle()
RETURNS JSON AS $$
DECLARE
  soft_deleted_count INTEGER;
  hard_deleted_count INTEGER;
BEGIN
  -- Soft Delete: Sold > 3 days ago
  WITH soft_deleted AS (
    UPDATE products
    SET is_soft_deleted = TRUE, soft_deleted_at = NOW()
    WHERE sold = TRUE 
      AND sold_at < NOW() - INTERVAL '3 days'
      AND is_soft_deleted = FALSE
    RETURNING id
  )
  SELECT COUNT(*) INTO soft_deleted_count FROM soft_deleted;

  -- Hard Delete: Sold > 14 days ago
  WITH hard_deleted AS (
    DELETE FROM products
    WHERE sold = TRUE 
      AND sold_at < NOW() - INTERVAL '14 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO hard_deleted_count FROM hard_deleted;

  RETURN json_build_object(
    'soft_deleted', soft_deleted_count,
    'hard_deleted', hard_deleted_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
