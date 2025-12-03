-- ============================================
-- MESSAGE NOTIFICATIONS SETUP
-- ============================================
-- Run this in Supabase SQL Editor

-- Add chat_id column to notifications table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'chat_id'
  ) THEN
    ALTER TABLE notifications 
    ADD COLUMN chat_id UUID REFERENCES chats(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Update notifications table to allow favoriter_id to be NULL (for product_sold and message notifications)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'favoriter_id'
  ) THEN
    -- Make favoriter_id nullable if it's not already
    ALTER TABLE notifications 
    ALTER COLUMN favoriter_id DROP NOT NULL;
  END IF;
END $$;

-- Function to create notification when a new message is sent
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_username TEXT;
  chat_info RECORD;
BEGIN
  -- Get chat information to find the recipient (the other user in the chat)
  SELECT buyer_id, seller_id INTO chat_info
  FROM chats
  WHERE id = NEW.chat_id;

  -- Determine recipient (the user who didn't send the message)
  IF chat_info.buyer_id = NEW.sender_id THEN
    recipient_id := chat_info.seller_id;
  ELSE
    recipient_id := chat_info.buyer_id;
  END IF;

  -- Only create notification if recipient exists and is not the sender
  IF recipient_id IS NOT NULL AND recipient_id != NEW.sender_id THEN
    -- Get sender username for the notification
    SELECT COALESCE(
      (raw_user_meta_data->>'username'),
      SPLIT_PART(email, '@', 1)
    ) INTO sender_username
    FROM auth.users
    WHERE id = NEW.sender_id;

    -- Create notification
    INSERT INTO notifications (user_id, favoriter_id, type, item_id, item_type, chat_id)
    VALUES (
      recipient_id,
      NEW.sender_id, -- Store sender_id in favoriter_id field (reusing the field)
      'new_message',
      NEW.chat_id, -- Store chat_id in item_id field
      'chat',
      NEW.chat_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification when message is added
DROP TRIGGER IF EXISTS trigger_create_message_notification ON messages;
CREATE TRIGGER trigger_create_message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();

