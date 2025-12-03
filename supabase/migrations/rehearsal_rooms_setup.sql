-- Create rehearsal_rooms table
CREATE TABLE IF NOT EXISTS rehearsal_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  address TEXT,
  location TEXT,
  description TEXT,
  payment_type TEXT,
  price DECIMAL(10, 2),
  room_size DECIMAL(10, 2), -- in m²
  type TEXT NOT NULL CHECK (type IN ('Musikstudie', 'Øvelokale', 'Andet')),
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_rehearsal_rooms_user_id ON rehearsal_rooms(user_id);
CREATE INDEX IF NOT EXISTS idx_rehearsal_rooms_type ON rehearsal_rooms(type);
CREATE INDEX IF NOT EXISTS idx_rehearsal_rooms_location ON rehearsal_rooms(location);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_rehearsal_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rehearsal_rooms_updated_at
  BEFORE UPDATE ON rehearsal_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_rehearsal_rooms_updated_at();

-- Enable Row Level Security
ALTER TABLE rehearsal_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view rehearsal rooms
CREATE POLICY "Anyone can view rehearsal rooms"
  ON rehearsal_rooms
  FOR SELECT
  USING (true);

-- Users can insert their own rehearsal rooms
CREATE POLICY "Users can insert their own rehearsal rooms"
  ON rehearsal_rooms
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own rehearsal rooms
CREATE POLICY "Users can update their own rehearsal rooms"
  ON rehearsal_rooms
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own rehearsal rooms
CREATE POLICY "Users can delete their own rehearsal rooms"
  ON rehearsal_rooms
  FOR DELETE
  USING (auth.uid() = user_id);

