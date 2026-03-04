drop policy if exists "Conversations select for members" on public.conversations;
create policy "Conversations select for members"
  on public.conversations
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_conversation_member(id, auth.uid())
  );

drop policy if exists "Conversations update for members" on public.conversations;
create policy "Conversations update for members"
  on public.conversations
  for update
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_conversation_member(id, auth.uid())
  )
  with check (
    created_by = auth.uid()
    or public.is_conversation_member(id, auth.uid())
  );
