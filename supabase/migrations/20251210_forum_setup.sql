-- Create forum_categories table
create table if not exists public.forum_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create forum_threads table
create table if not exists public.forum_threads (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references public.forum_categories(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  author_name text,
  title text not null,
  content text not null,
  view_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create forum_posts table (replies)
create table if not exists public.forum_posts (
  id uuid default gen_random_uuid() primary key,
  thread_id uuid references public.forum_threads(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  author_name text,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for faster queries
create index if not exists idx_forum_threads_category on public.forum_threads(category_id);
create index if not exists idx_forum_posts_thread on public.forum_posts(thread_id);

-- Enable Row Level Security
alter table public.forum_categories enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;

-- Policies
create policy "Categories are viewable by everyone" on public.forum_categories for select using (true);

create policy "Threads are viewable by everyone" on public.forum_threads for select using (true);
create policy "Authenticated users can create threads" on public.forum_threads for insert with check (auth.uid() = user_id);
create policy "Users can update own threads" on public.forum_threads for update using (auth.uid() = user_id);
create policy "Users can delete own threads" on public.forum_threads for delete using (auth.uid() = user_id);

create policy "Posts are viewable by everyone" on public.forum_posts for select using (true);
create policy "Authenticated users can create posts" on public.forum_posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts" on public.forum_posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts" on public.forum_posts for delete using (auth.uid() = user_id);

-- Seed Categories
insert into public.forum_categories (name, slug, description) values
('Musikudstyr Generelt', 'gear-talk', 'Diskussion om alt slags musikudstyr.'),
('Trommer & Slagtøj', 'drums', 'Snak om trommer, bækkener og hardware.'),
('Guitar & Bas', 'guitars-bass', 'Alt om strengeinstrumenter, amps og pedaler.'),
('Studie & Produktion', 'studio', 'Indspilning, mixing, DAW og mikrofoner.'),
('Keyboards & Synths', 'keyboards', 'Alt om tangenter, synthesizers og klaverer.'),
('Blæs & Messing', 'winds', 'Saxofon, trompet, tværfløjte og andet blæs.'),
('Strygere', 'strings', 'Violin, cello, kontrabas og andre strygere.'),
('Reparation & Vedligeholdelse', 'repair-maintenance', 'Hjælp til reparation, lodning og justering af gear.'),
('Køb & Salg Erfaringer', 'marketplace-feedback', 'Del dine erfaringer med handler.'),
('Off-Topic', 'off-topic', 'Alt det der ikke handler om gear.')
on conflict (slug) do nothing;
