-- Add missing indexes on foreign keys for better query performance
-- These indexes speed up JOINs and lookups on foreign key columns

-- postgres-migrations disable-transaction
-- Required because CREATE INDEX CONCURRENTLY cannot run inside a transaction

-- Forum tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_posts_user_id 
  ON public.forum_posts(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_threads_user_id 
  ON public.forum_threads(user_id);

-- Messages table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id 
  ON public.messages(sender_id);

-- Notifications table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_chat_id 
  ON public.notifications(chat_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_favoriter_id 
  ON public.notifications(favoriter_id);

-- Reviews table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_reviewee_id 
  ON public.reviews(reviewee_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_reviewer_id 
  ON public.reviews(reviewer_id);

-- Sales table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_buyer_id 
  ON public.sales(buyer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_seller_id 
  ON public.sales(seller_id);
