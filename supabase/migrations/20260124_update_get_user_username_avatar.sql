-- Update get_user_username function to include avatar_url
-- This allows retrieving the user's profile picture

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
    'email', email,
    'avatar_url', (raw_user_meta_data->>'avatar_url')::TEXT
  ) INTO result
  FROM auth.users
  WHERE id = user_uuid;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_user_username(UUID) TO anon, authenticated;
