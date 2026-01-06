-- ============================================
-- FORUM REPLY NOTIFICATIONS
-- ============================================

-- Create notification when someone replies to another user's thread
CREATE OR REPLACE FUNCTION public.create_forum_reply_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  thread_owner UUID;
BEGIN
  SELECT user_id INTO thread_owner
  FROM forum_threads
  WHERE id = NEW.thread_id;

  -- Skip if thread is missing or author replies to own thread
  IF thread_owner IS NULL OR thread_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, favoriter_id, type, item_id, item_type)
  VALUES (
    thread_owner,         -- recipient
    NEW.user_id,          -- replier
    'forum_reply',        -- notification type
    NEW.thread_id,        -- thread id
    'forum_thread'        -- item type
  );

  RETURN NEW;
END;
$$;

-- Trigger on forum_posts insert
DROP TRIGGER IF EXISTS trigger_forum_reply_notification ON forum_posts;
CREATE TRIGGER trigger_forum_reply_notification
  AFTER INSERT ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION create_forum_reply_notification();

