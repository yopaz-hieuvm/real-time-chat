-- Add updated_at column to messages table
alter table public.messages add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now());

-- Set updated_at for existing rows
update public.messages set updated_at = created_at where updated_at is null;

-- Drop old policy if exists and create new one for update
drop policy if exists "Allow public update messages" on public.messages;

create policy "Allow public update messages" on public.messages
  for update
  using (true)
  with check (true);
