# Supabase Database

Folder này chứa tất cả database migrations và cấu hình Supabase.

## Cấu trúc

```
supabase/
├── config.toml           # Cấu hình Supabase local
├── migrations/           # Database migrations
│   └── 20240303000000_create_messages_table.sql
└── .gitignore           # Ignore local files
```

## Lệnh Hữu ích

### 1. Link project

```bash
supabase link --project-ref ijmzbxveavwteyumctba
```

### 2. Push migrations lên remote

```bash
supabase db push
```

### 3. Pull schema từ remote

```bash
supabase db pull
```

### 4. Tạo migration mới

```bash
supabase migration new --name your_migration_name
```

Sẽ tạo file: `migrations/[timestamp]_your_migration_name.sql`

Ví dụ:

```bash
supabase migration new --name add_user_email
# Tạo: migrations/20240303120000_add_user_email.sql
```

### 5. Xem danh sách migrations

```bash
supabase migration list
```

### 6. Reset database

```bash
# Drop all tables
supabase db reset
```

## Migration Template

```sql
-- comments describe the change
create table if not exists public.example (
  id bigint primary key generated always as identity,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.example enable row level security;

-- Create policy
create policy "Allow public read" on public.example
  for select using (true);

-- Enable Realtime
alter publication supabase_realtime add table public.example;
```

## Notes

- Migrations được run theo thứ tự timestamp
- File names phải bắt đầu với timestamp `YYYYMMDDHHMMSS`
- Nên test migration cục bộ trước khi push
- Luôn backup database trước khi chạy migrations lớn
