-- Create messages table
create table if not exists public.messages (
  id bigint primary key generated always as identity,
  content text not null,
  user_name text not null default 'Anonymous',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index on created_at for better query performance
create index if not exists messages_created_at_idx on public.messages(created_at desc);

-- Enable RLS (Row Level Security)
alter table public.messages enable row level security;

-- Allow everyone to read messages
create policy "Allow public read messages" on public.messages
  for select
  using (true);

-- Allow everyone to insert messages
create policy "Allow public insert messages" on public.messages
  for insert
  with check (true);

-- Enable Realtime
alter publication supabase_realtime add table public.messages;
