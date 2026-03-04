create or replace function public.set_conversation_creator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_by := auth.uid();
  new.updated_at := timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_set_conversation_creator on public.conversations;
create trigger trg_set_conversation_creator
  before insert on public.conversations
  for each row
  execute function public.set_conversation_creator();

drop policy if exists "Conversations insert authenticated" on public.conversations;
create policy "Conversations insert authenticated"
  on public.conversations
  for insert
  to authenticated
  with check (auth.uid() is not null);
