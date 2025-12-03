-- ============================================
-- NOTIFICATIONS TABLE SETUP
-- ============================================
-- Run this in Supabase SQL Editor

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'favorite_product' or 'favorite_room'
  item_id UUID NOT NULL, -- product_id or room_id
  item_type VARCHAR(20) NOT NULL, -- 'product' or 'room'
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add favoriter_id column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'favoriter_id'
  ) THEN
    -- Delete old notifications that don't have favoriter info (can't determine who favorited)
    DELETE FROM notifications;
    
    -- Add the new column
    ALTER TABLE notifications 
    ADD COLUMN favoriter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL;
  END IF;
END $$;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: System can insert notifications (via trigger)
-- Note: This uses SECURITY DEFINER in the function, so it bypasses RLS
-- But we still need a policy for the trigger to work
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create notification when favorite is added
CREATE OR REPLACE FUNCTION create_favorite_notification()
RETURNS TRIGGER AS $$
DECLARE
  item_owner_id UUID;
  item_type_val VARCHAR(20);
BEGIN
  -- Determine if it's a product or room and get the owner
  IF NEW.product_id IS NOT NULL THEN
    SELECT user_id INTO item_owner_id
    FROM products
    WHERE id = NEW.product_id;
    item_type_val := 'product';
  ELSIF NEW.room_id IS NOT NULL THEN
    SELECT user_id INTO item_owner_id
    FROM rehearsal_rooms
    WHERE id = NEW.room_id;
    item_type_val := 'room';
  END IF;

  -- Only create notification if the favoriter is not the owner
  IF item_owner_id IS NOT NULL AND item_owner_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, favoriter_id, type, item_id, item_type)
    VALUES (
      item_owner_id,
      NEW.user_id, -- The person who favorited
      'favorite_' || item_type_val,
      COALESCE(NEW.product_id, NEW.room_id),
      item_type_val
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification when favorite is added
DROP TRIGGER IF EXISTS trigger_create_favorite_notification ON favorites;
CREATE TRIGGER trigger_create_favorite_notification
  AFTER INSERT ON favorites
  FOR EACH ROW
  EXECUTE FUNCTION create_favorite_notification();

