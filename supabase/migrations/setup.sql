-- ============================================
-- PRODUCTS TABLE SETUP
-- ============================================
-- Run this in Supabase SQL Editor

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  description TEXT,
  price DECIMAL(10, 2),
  location VARCHAR(200),
  condition VARCHAR(50),
  year INTEGER,
  image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type);

-- Enable Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view products
CREATE POLICY "Anyone can view products"
  ON products
  FOR SELECT
  USING (true);

-- Policy: Users can insert their own products
CREATE POLICY "Users can insert their own products"
  ON products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own products
CREATE POLICY "Users can update their own products"
  ON products
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own products
CREATE POLICY "Users can delete their own products"
  ON products
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================
-- Note: If you already have a bucket called 'gearninjaImages', 
-- you can skip the INSERT statement below and just run the policies.

-- Create storage bucket for product images (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('gearninjaImages', 'gearninjaImages', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own product images" ON storage.objects;

-- Storage policies for gearninjaImages bucket
-- Policy: Anyone can view images
CREATE POLICY "Anyone can view product images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'gearninjaImages');

-- Policy: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'gearninjaImages' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Users can update their own images
-- Files are stored as: user_id/filename.ext
CREATE POLICY "Users can update their own product images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'gearninjaImages' 
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'gearninjaImages' 
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own images
-- Files are stored as: user_id/filename.ext
CREATE POLICY "Users can delete their own product images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'gearninjaImages' 
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

