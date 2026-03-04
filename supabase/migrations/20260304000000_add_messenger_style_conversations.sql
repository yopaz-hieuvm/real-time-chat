create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct', 'group')),
  name text,
  pair_key text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint conversations_group_name_check
    check ((type = 'group' and name is not null and length(trim(name)) > 0) or type = 'direct'),
  constraint conversations_direct_pair_key_check
    check ((type = 'direct' and pair_key is not null) or type = 'group')
);

create unique index if not exists conversations_direct_pair_key_uidx
  on public.conversations(pair_key)
  where type = 'direct';

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default timezone('utc'::text, now()),
  primary key (conversation_id, user_id)
);

create index if not exists conversation_members_user_id_idx
  on public.conversation_members(user_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists chat_messages_conversation_id_created_at_idx
  on public.chat_messages(conversation_id, created_at);

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

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Profiles select" on public.profiles;
drop policy if exists "Profiles insert own" on public.profiles;
drop policy if exists "Profiles update own" on public.profiles;

create policy "Profiles select"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "Profiles insert own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "Profiles update own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Conversations select for members" on public.conversations;
drop policy if exists "Conversations insert authenticated" on public.conversations;
drop policy if exists "Conversations update for members" on public.conversations;

create policy "Conversations select for members"
  on public.conversations
  for select
  to authenticated
  using (
    created_by = auth.uid()
    or public.is_conversation_member(id, auth.uid())
  );

create policy "Conversations insert authenticated"
  on public.conversations
  for insert
  to authenticated
  with check (auth.uid() is not null);

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

drop policy if exists "Conversation members select for members" on public.conversation_members;
drop policy if exists "Conversation members insert for members" on public.conversation_members;
drop policy if exists "Conversation members delete for members" on public.conversation_members;

create policy "Conversation members select for members"
  on public.conversation_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_conversation_member(conversation_id, auth.uid())
  );

create policy "Conversation members insert for members"
  on public.conversation_members
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or exists (
      select 1
      from public.conversations conversations
      where conversations.id = conversation_id
        and conversations.created_by = auth.uid()
    )
    or public.is_conversation_member(conversation_id, auth.uid())
  );

create policy "Conversation members delete for members"
  on public.conversation_members
  for delete
  to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "Chat messages select for members" on public.chat_messages;
drop policy if exists "Chat messages insert own" on public.chat_messages;
drop policy if exists "Chat messages update own" on public.chat_messages;
drop policy if exists "Chat messages delete own" on public.chat_messages;

create policy "Chat messages select for members"
  on public.chat_messages
  for select
  to authenticated
  using (public.is_conversation_member(conversation_id, auth.uid()));

create policy "Chat messages insert own"
  on public.chat_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_member(conversation_id, auth.uid())
  );

create policy "Chat messages update own"
  on public.chat_messages
  for update
  to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

create policy "Chat messages delete own"
  on public.chat_messages
  for delete
  to authenticated
  using (sender_id = auth.uid());

alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;
alter publication supabase_realtime add table public.chat_messages;
