-- Create dedicated forum_favorites table
CREATE TABLE forum_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_forum_favorite UNIQUE (user_id, thread_id)
);

-- Enable RLS
ALTER TABLE forum_favorites ENABLE ROW LEVEL SECURITY;

-- Policies for forum_favorites
CREATE POLICY "Users can view their own forum favorites" 
ON forum_favorites FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own forum favorites" 
ON forum_favorites FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own forum favorites" 
ON forum_favorites FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_forum_favorites_user_id ON forum_favorites(user_id);
CREATE INDEX idx_forum_favorites_thread_id ON forum_favorites(thread_id);
