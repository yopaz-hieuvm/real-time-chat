-- Allow everyone to delete messages (needed for the "clear chat" button)

alter table public.messages enable row level security;

create policy "Allow public delete messages" on public.messages
  for delete
  using (true);
