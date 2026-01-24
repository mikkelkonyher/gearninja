-- Rename "Off-Topic" category to "Andet" and make it appear last
ALTER TABLE public.forum_categories ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

UPDATE public.forum_categories 
SET name = 'Andet', sort_order = 999 
WHERE slug = 'off-topic';
