-- Add soft delete columns to chats table
ALTER TABLE chats 
ADD COLUMN IF NOT EXISTS deleted_by_buyer BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS deleted_by_seller BOOLEAN DEFAULT FALSE;
