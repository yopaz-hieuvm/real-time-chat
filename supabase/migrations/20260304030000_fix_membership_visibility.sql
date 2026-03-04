create or replace function public.is_conversation_member(target_conversation_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members members
    where members.conversation_id = target_conversation_id
      and members.user_id = target_user_id
  );
$$;

grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

drop policy if exists "Conversation members select for members" on public.conversation_members;
create policy "Conversation members select for members"
  on public.conversation_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id, auth.uid())
  );
