-- Create user_post_views table for tracking post views
create table if not exists public.user_post_views (
  id uuid not null default extensions.uuid_generate_v4(),
  user_id uuid not null,
  post_id uuid not null,
  viewed_at timestamp with time zone not null default now(),
  constraint user_post_views_pkey primary key (id),
  constraint user_post_views_user_post_key unique (user_id, post_id),
  constraint user_post_views_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint user_post_views_post_id_fkey foreign key (post_id) references public.discussions (id) on delete cascade
);

-- Create indexes for performance
create index if not exists idx_user_post_views_user_id on public.user_post_views using btree (user_id);
create index if not exists idx_user_post_views_post_id on public.user_post_views using btree (post_id);

-- Enable Row Level Security
alter table public.user_post_views enable row level security;

-- Create RLS policy allowing users to only see their own views
create policy "Users can view their own post views" on public.user_post_views
  for select using (auth.uid() = user_id);

-- Create RLS policy allowing users to insert their own views
create policy "Users can insert their own post views" on public.user_post_views
  for insert with check (auth.uid() = user_id);

-- Create RLS policy allowing users to update their own views
create policy "Users can update their own post views" on public.user_post_views
  for update using (auth.uid() = user_id);

-- Create RLS policy allowing users to delete their own views
create policy "Users can delete their own post views" on public.user_post_views
  for delete using (auth.uid() = user_id);
