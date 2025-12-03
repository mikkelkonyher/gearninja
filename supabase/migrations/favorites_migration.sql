-- Create favorites table
CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rehearsal_rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Ensure a user can only favorite a specific item once
  CONSTRAINT unique_product_favorite UNIQUE (user_id, product_id),
  CONSTRAINT unique_room_favorite UNIQUE (user_id, room_id),
  -- Ensure either product_id or room_id is set, but not both
  CONSTRAINT check_item_type CHECK (
    (product_id IS NOT NULL AND room_id IS NULL) OR
    (product_id IS NULL AND room_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can view favorites (needed for counting likes)
CREATE POLICY "Everyone can view favorites" 
ON favorites FOR SELECT 
USING (true);

-- Users can insert their own favorites
CREATE POLICY "Users can insert their own favorites" 
ON favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY "Users can delete their own favorites" 
ON favorites FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_product_id ON favorites(product_id);
CREATE INDEX idx_favorites_room_id ON favorites(room_id);
