-- Simple email notification trigger for new chat messages
-- Uses Supabase Database Webhooks (configure in Dashboard)

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_recipient_id UUID;
  v_chat RECORD;
BEGIN
  -- Get chat details
  SELECT * INTO v_chat FROM chats WHERE id = NEW.chat_id;
  
  -- Determine recipient (the person who didn't send the message)
  IF NEW.sender_id = v_chat.buyer_id THEN
    v_recipient_id := v_chat.seller_id;
  ELSE
    v_recipient_id := v_chat.buyer_id;
  END IF;
  
  -- Store recipient_id in a column for webhook to use
  -- We'll use a notification table approach
  INSERT INTO message_notifications (
    message_id,
    chat_id,
    sender_id,
    recipient_id,
    content
  ) VALUES (
    NEW.id,
    NEW.chat_id,
    NEW.sender_id,
    v_recipient_id,
    NEW.content
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create notifications table
CREATE TABLE IF NOT EXISTS message_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  chat_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on message_notifications
ALTER TABLE message_notifications ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (webhooks use service role)
CREATE POLICY "Service role can manage message notifications"
  ON message_notifications
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create trigger
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Now set up a Database Webhook in Supabase Dashboard:
-- Table: message_notifications
-- Event: INSERT
-- Webhook URL: https://YOUR_PROJECT.supabase.co/functions/v1/send-message-email
-- HTTP Headers: {"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}
