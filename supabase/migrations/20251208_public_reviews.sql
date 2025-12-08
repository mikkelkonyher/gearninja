-- Update reviews table RLS to allow public viewing
-- This is necessary for the public user profile page to display reviews

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can view reviews for sales they are part of" ON reviews;
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;

-- Create new policy allowing anyone to view reviews
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);
