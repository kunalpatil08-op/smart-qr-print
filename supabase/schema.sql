-- ============================================================================
-- SMART QR PRINT — PostgreSQL schema for Supabase
-- Run this in the Supabase SQL editor, then deploy the ai-chat function.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums ----
create type user_role     as enum ('student', 'shop_owner', 'admin');
create type order_status  as enum ('uploaded','payment_pending','payment_verified','in_queue','printing','completed','failed','cancelled');
create type printer_state as enum ('online','busy','maintenance','offline');
create type payment_state as enum ('created','paid','failed','refunded');

-- ---------------------------------------------------------------- users ----
-- Mirrors auth.users; created by the trigger below.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'student',
  full_name   text not null,
  email       text not null,
  created_at  timestamptz not null default now()
);

create table public.student_profiles (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  college     text,
  course      text,
  year        text,
  monthly_page_limit int not null default 400
);

-- ---------------------------------------------------------------- shops ----
create table public.shops (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null unique references public.profiles(id) on delete cascade,
  name          text not null,
  address       text,
  phone         text,
  hours         text,
  upi_id        text,
  qr_token      text not null unique default encode(gen_random_bytes(12),'hex'),
  is_open       boolean not null default false,
  retention_hours int not null default 24 check (retention_hours between 1 and 720),
  pricing       jsonb not null default '{
    "bwSingle": 2, "bwDouble": 1.5, "colorSingle": 8,
    "colorDouble": 6, "a3Multiplier": 2, "binding": 20
  }'::jsonb,
  created_at    timestamptz not null default now()
);

create table public.printers (
  id        uuid primary key default gen_random_uuid(),
  shop_id   uuid not null references public.shops(id) on delete cascade,
  name      text not null,
  type      text,
  status    printer_state not null default 'offline',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------ documents ----
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,            -- path inside the private 'documents' bucket
  name         text not null,
  pages        int  not null default 1,
  size_bytes   bigint,
  expires_at   timestamptz not null default now() + interval '24 hours',
  deleted_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index documents_user_idx    on public.documents(user_id);
create index documents_expiry_idx  on public.documents(expires_at) where deleted_at is null;

-- --------------------------------------------------------------- orders ----
create table public.printing_orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete restrict,
  shop_id         uuid not null references public.shops(id) on delete restrict,
  document_id     uuid references public.documents(id) on delete set null,
  document_name   text not null,
  page_range      text,
  pages           int  not null check (pages > 0),
  copies          int  not null default 1 check (copies between 1 and 100),
  is_color        boolean not null default false,
  is_duplex       boolean not null default false,
  paper_size      text not null default 'A4',
  add_binding     boolean not null default false,
  amount          numeric(10,2) not null,          -- computed server-side
  status          order_status not null default 'payment_pending',
  failure_reason  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index orders_shop_idx    on public.printing_orders(shop_id, created_at desc);
create index orders_user_idx    on public.printing_orders(user_id, created_at desc);

create table public.order_status_history (
  id        bigserial primary key,
  order_id  uuid not null references public.printing_orders(id) on delete cascade,
  status    order_status not null,
  note      text,
  actor_id  uuid references public.profiles(id),
  at        timestamptz not null default now()
);

-- ------------------------------------------------------------- payments ----
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null unique references public.printing_orders(id) on delete cascade,
  provider     text not null,                 -- 'razorpay' | 'stripe'
  provider_ref text unique,                   -- gateway payment id
  amount       numeric(10,2) not null,
  state        payment_state not null default 'created',
  raw          jsonb,
  verified_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------------ AI -----
create table public.ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null default 'New conversation',
  subject    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  created_at      timestamptz not null default now()
);
create index ai_messages_conv_idx on public.ai_messages(conversation_id, created_at);

create table public.generated_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  subject    text,
  style      text,
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------- pricing engine ----
-- The single source of truth for money. Called by create_order() and by the
-- client for a live estimate (same formula, so the UI can never disagree).
create or replace function public.calculate_price(
  p_shop uuid, p_pages int, p_copies int, p_color boolean,
  p_duplex boolean, p_paper text, p_binding boolean
) returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  pr jsonb; per_page numeric; mult numeric; sheets int; total numeric;
begin
  select pricing into pr from shops where id = p_shop;
  if pr is null then raise exception 'shop not found'; end if;

  per_page := case
    when p_color and p_duplex then (pr->>'colorDouble')::numeric
    when p_color              then (pr->>'colorSingle')::numeric
    when p_duplex             then (pr->>'bwDouble')::numeric
    else                           (pr->>'bwSingle')::numeric end;
  mult   := case when p_paper = 'A3' then (pr->>'a3Multiplier')::numeric else 1 end;
  sheets := case when p_duplex then ceil(p_pages / 2.0) else p_pages end;

  total := per_page * mult * sheets * p_copies
         + case when p_binding then (pr->>'binding')::numeric * p_copies else 0 end;
  return round(total, 2);
end $$;

-- -------------------------------------------------------- create order -----
create or replace function public.create_order(
  p_shop uuid, p_document uuid, p_document_name text, p_page_range text,
  p_pages int, p_copies int, p_color boolean, p_duplex boolean,
  p_paper text, p_binding boolean
) returns printing_orders
language plpgsql security definer set search_path = public as $$
declare
  v_shop shops; v_amount numeric; v_order printing_orders; v_dup int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into v_shop from shops where id = p_shop;
  if not found or not v_shop.is_open then raise exception 'shop is closed'; end if;

  -- accidental duplicate guard: same document + config within 10 minutes
  select count(*) into v_dup from printing_orders
   where user_id = auth.uid() and shop_id = p_shop and document_name = p_document_name
     and status not in ('cancelled','failed') and created_at > now() - interval '10 minutes';
  if v_dup > 0 then raise exception 'duplicate order'; end if;

  v_amount := calculate_price(p_shop, p_pages, p_copies, p_color, p_duplex, p_paper, p_binding);

  insert into printing_orders (user_id, shop_id, document_id, document_name, page_range,
    pages, copies, is_color, is_duplex, paper_size, add_binding, amount, status)
  values (auth.uid(), p_shop, p_document, p_document_name, p_page_range,
    p_pages, p_copies, p_color, p_duplex, p_paper, p_binding, v_amount, 'payment_pending')
  returning * into v_order;

  insert into order_status_history (order_id, status, note, actor_id)
  values (v_order.id, 'uploaded', 'Order created', auth.uid());

  return v_order;
end $$;

-- ------------------------------------------------------ advance status -----
-- Students may only cancel before printing. Shops may move forward.
create or replace function public.advance_order(p_order uuid, p_status order_status, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_order printing_orders; v_is_shop boolean;
begin
  select * into v_order from printing_orders where id = p_order;
  if not found then raise exception 'order not found'; end if;

  select exists (select 1 from shops where owner_id = auth.uid() and id = v_order.shop_id) into v_is_shop;

  if v_is_shop then
    null;                                   -- shop: any transition
  elsif v_order.user_id = auth.uid() then
    if p_status <> 'cancelled' then raise exception 'not allowed'; end if;
    if v_order.status not in ('payment_pending','payment_verified','in_queue') then
      raise exception 'order can no longer be cancelled';
    end if;
  else
    raise exception 'not allowed';
  end if;

  update printing_orders set status = p_status, updated_at = now() where id = p_order;
  insert into order_status_history (order_id, status, note, actor_id)
  values (p_order, p_status, p_note, auth.uid());
end $$;

-- ----------------------------------------------------------- retention -----
create or replace function public.purge_expired_documents()
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with gone as (
    delete from documents
     where expires_at < now() and deleted_at is null
    returning 1
  ) select count(*) into n from gone;
  return n;
end $$;
-- Schedule with pg_cron:
-- select cron.schedule('purge-documents', '0 * * * *', $$select public.purge_expired_documents()$$);

-- ----------------------------------------------- new user provisioning ----
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', 'New user'),
    new.email
  );
  insert into public.student_profiles (user_id) values (new.id)
    on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================================================== RLS policies ==
alter table public.profiles             enable row level security;
alter table public.student_profiles     enable row level security;
alter table public.shops                enable row level security;
alter table public.printers             enable row level security;
alter table public.documents            enable row level security;
alter table public.printing_orders      enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments             enable row level security;
alter table public.ai_conversations     enable row level security;
alter table public.ai_messages          enable row level security;
alter table public.generated_notes      enable row level security;

create policy "own profile"        on public.profiles for all using (id = auth.uid());
create policy "own student row"    on public.student_profiles for all using (user_id = auth.uid());

create policy "shops are public"   on public.shops for select using (true);
create policy "owner edits shop"   on public.shops for update using (owner_id = auth.uid());
create policy "owner inserts shop" on public.shops for insert with check (owner_id = auth.uid());

create policy "printers are public" on public.printers for select using (true);
create policy "owner edits printers" on public.printers for all using (
  exists (select 1 from public.shops s where s.id = printers.shop_id and s.owner_id = auth.uid())
);

create policy "own documents"      on public.documents for all using (user_id = auth.uid());

create policy "student sees own orders" on public.printing_orders for select using (
  user_id = auth.uid()
  or exists (select 1 from public.shops s where s.id = printing_orders.shop_id and s.owner_id = auth.uid())
);
-- Inserts/updates go through the SECURITY DEFINER functions above only.

create policy "history visible to parties" on public.order_status_history for select using (
  exists (
    select 1 from public.printing_orders o
    left join public.shops s on s.id = o.shop_id
    where o.id = order_status_history.order_id
      and (o.user_id = auth.uid() or s.owner_id = auth.uid())
  )
);

create policy "own payments" on public.payments for select using (
  exists (
    select 1 from public.printing_orders o
    left join public.shops s on s.id = o.shop_id
    where o.id = payments.order_id and (o.user_id = auth.uid() or s.owner_id = auth.uid())
  )
);

create policy "own conversations" on public.ai_conversations for all using (user_id = auth.uid());
create policy "own messages" on public.ai_messages for all using (
  exists (select 1 from public.ai_conversations c where c.id = ai_messages.conversation_id and c.user_id = auth.uid())
);
create policy "own notes" on public.generated_notes for all using (user_id = auth.uid());

-- ------------------------------------------------------------- storage -----
-- Private bucket for temporary documents.
insert into storage.buckets (id, name, public) values ('documents','documents', false)
  on conflict (id) do nothing;

create policy "users upload own docs" on storage.objects for insert
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users read own docs" on storage.objects for select
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own docs" on storage.objects for delete
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
