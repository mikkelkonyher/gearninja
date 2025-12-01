# Supabase Setup Instructions

## 1. Run SQL in Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/setup.sql`
4. Click **Run** to execute the SQL

This will create:
- `products` table with all required columns
- Row Level Security (RLS) policies
- Indexes for performance
- Storage bucket for product images
- Storage policies for image uploads

## 2. Verify Storage Bucket

1. Go to **Storage** in your Supabase Dashboard
2. Verify that `product-images` bucket exists
3. Make sure it's set to **Public**

## 3. Test the Setup

After running the SQL:
- Try creating a product through the UI
- Images should upload to the `product-images` bucket
- Products should be saved to the `products` table

## Notes

- The first image uploaded becomes the main image (index 0 in `image_urls` array)
- Users can only edit/delete their own products (enforced by RLS)
- All products are viewable by anyone (public read access)

