-- Function to get username from user metadata
-- This function can be called from the client to get username for a user_id
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_user_username(user_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'username', COALESCE(
      (raw_user_meta_data->>'username')::TEXT,
      SPLIT_PART(email, '@', 1)
    ),
    'email', email
  ) INTO result
  FROM auth.users
  WHERE id = user_uuid;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_user_username(UUID) TO anon, authenticated;

