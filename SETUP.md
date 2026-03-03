# Real-time Chat Application

Ứng dụng chat real-time sử dụng Supabase, Nuxt 4 và Vue 3.

## Setup

### 1. Cài đặt Supabase CLI

```bash
npm install -g supabase
```

### 2. Kiểm tra Supabase Project

Project URL và API Key đã được cấu hình trong `.env.local`:
```
NUXT_PUBLIC_SUPABASE_URL=https://ijmzbxveavwteyumctba.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_zuhxqtlRwdVbtUl-YooTJg_sJ7SomXd
```

### 3. Link Project

Link local project với Supabase remote:

```bash
cd realtime-chat
supabase link --project-ref ijmzbxveavwteyumctba
```

Nếu được hỏi database version, nhập **Y** để update.

### 4. Push Migration

Push migration để tạo bảng `messages`:

```bash
supabase db push
```

Xác nhận với **Y** để apply migration.

### 4. Cấu hình Environment Variables

Nuxt chỉ tự động nạp các biến từ **`.env`**, không phải `.env.local`. Nếu bạn đang dùng `.env.local` (vì Git ignore), hãy
- copy/rename nó thành `.env` trước khi khởi động server, hoặc
- thêm nội dung vào cả hai file.

File mẫu nằm trong `.env.example` nên bạn chỉ cần sao chép:

```bash
cp .env.example .env
# rồi chỉnh lại giá trị nếu cần
```

Cấu hình sẽ trông như sau:

```
NUXT_PUBLIC_SUPABASE_URL=https://ijmzbxveavwteyumctba.supabase.co
NUXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_zuhxqtlRwdVbtUl-YooTJg_sJ7SomXd
PASSWORD_SUPABASE=Normal1210@12
```

### 5. Cài đặt Dependencies

```bash
yarn install
```

### 6. Chạy Ứng dụng

Sau khi thiết lập `.env.local` hoặc chỉnh sửa bất kỳ biến môi trường nào, hãy **khởi động lại** server dev để Nuxt nạp các giá trị mới:

```bash
# dừng nếu đang chạy, rồi
yarn dev
```

Mở http://localhost:3001

## Cấu trúc Supabase

```
supabase/
├── config.toml          # Cấu hình Supabase local
└── migrations/
    └── 20240303000000_create_messages_table.sql
```

Migration files được đặt tên theo timestamp để Supabase biết thứ tự chạy.

## Tính năng

- ✅ Chat real-time với Supabase Realtime
- ✅ Đặt tên người dùng (button 👤)
- ✅ Avatar đẹp cho người dùng/bot
- ✅ Lịch sử tin nhắn (lưu trong database)
- ✅ Xóa toàn bộ tin nhắn
- ✅ Responsive design
- ✅ Multi-user real-time sync

## Kiến trúc

```
Frontend (Nuxt 4 + Vue 3)
    ↓
Pinia Store (useChatStore)
    ↓
Supabase Client
    ↓
PostgreSQL Database + Realtime WebSocket
```

## Lệnh Supabase CLI Hữu ích

> ⚠️ **Mới**: một migration đã thêm chính sách `DELETE` để nút "Xóa chat" hoạt động. Sau khi kéo code mới, chạy:
>
> ```bash
> supabase db push
> ```
> 
> để áp policy này vào database (lệnh giống như khi bạn tạo migration mới).


```bash
# Xem danh sách migrations
supabase migration list

# Xem trạng thái database
supabase status

# Pull schema từ remote
supabase db pull

# Tạo migration mới
supabase migration new --name create_new_table

# View local Supabase Studio
# Mở http://localhost:54323 sau khi chạy supabase start
```

## Troubleshooting

**Q: Gặp lỗi "table does not exist"?**
- Chạy `supabase db push` để chạy migration

**Q: Real-time không hoạt động?**
- Kiểm tra `.env.local` có `NUXT_PUBLIC_SUPABASE_URL` và `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- Kiểm tra trong Supabase dashboard nếu Realtime được bật cho bảng `messages`

**Q: Muốn reset database?**
- Chạy `supabase migration list` để xem migrations
- Sau đó xóa bảng manual hoặc tạo migration mới để drop table

