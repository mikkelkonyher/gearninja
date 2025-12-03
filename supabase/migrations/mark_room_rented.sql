-- ============================================
-- MARK REHEARSAL ROOM AS RENTED FUNCTION
-- ============================================
-- Run this in Supabase SQL Editor

-- Add rented_out and rented_out_at columns to rehearsal_rooms table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rehearsal_rooms' AND column_name = 'rented_out'
  ) THEN
    ALTER TABLE rehearsal_rooms 
    ADD COLUMN rented_out BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rehearsal_rooms' AND column_name = 'rented_out_at'
  ) THEN
    ALTER TABLE rehearsal_rooms 
    ADD COLUMN rented_out_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index for rented rooms
CREATE INDEX IF NOT EXISTS idx_rehearsal_rooms_rented_out ON rehearsal_rooms(rented_out, rented_out_at);

-- Function to mark room as rented, notify favoriters (room stays for 3 days)
CREATE OR REPLACE FUNCTION mark_room_rented(room_uuid UUID, owner_uuid UUID)
RETURNS JSON AS $$
DECLARE
  room_name VARCHAR(255);
  room_type VARCHAR(100);
  favoriter_record RECORD;
  notification_count INTEGER := 0;
BEGIN
  -- Verify the user owns the room
  IF NOT EXISTS (
    SELECT 1 FROM rehearsal_rooms 
    WHERE id = room_uuid AND user_id = owner_uuid AND (rented_out IS NULL OR rented_out = FALSE)
  ) THEN
    RETURN json_build_object('error', 'Room not found, you do not own this room, or it is already rented');
  END IF;

  -- Get room details for notification
  SELECT name, type INTO room_name, room_type
  FROM rehearsal_rooms
  WHERE id = room_uuid;

  -- Create notifications for all users who favorited this room
  FOR favoriter_record IN
    SELECT DISTINCT f.user_id
    FROM favorites f
    WHERE f.room_id = room_uuid
      AND f.user_id != owner_uuid
  LOOP
    INSERT INTO notifications (user_id, favoriter_id, type, item_id, item_type)
    VALUES (
      favoriter_record.user_id,
      NULL, -- No favoriter for rented notifications
      'room_rented',
      room_uuid,
      'room'
    );
    notification_count := notification_count + 1;
  END LOOP;

  -- Delete all favorites for this room
  DELETE FROM favorites WHERE room_id = room_uuid;

  -- Mark room as rented and set rented_out_at timestamp (will be deleted after 3 days)
  UPDATE rehearsal_rooms 
  SET rented_out = TRUE, rented_out_at = NOW()
  WHERE id = room_uuid;

  RETURN json_build_object(
    'success', true,
    'notifications_sent', notification_count,
    'room_name', room_name,
    'room_type', room_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_room_rented(UUID, UUID) TO authenticated;

-- Function to delete rooms that have been rented for more than 3 days
CREATE OR REPLACE FUNCTION delete_old_rented_rooms()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete rooms that were marked as rented more than 3 days ago
  WITH deleted AS (
    DELETE FROM rehearsal_rooms
    WHERE rented_out = TRUE 
      AND rented_out_at IS NOT NULL
      AND rented_out_at < NOW() - INTERVAL '3 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_old_rented_rooms() TO authenticated;

-- Note: You should set up a cron job or scheduled task to run delete_old_rented_rooms() daily
-- In Supabase, you can use pg_cron extension or set up a scheduled Edge Function

