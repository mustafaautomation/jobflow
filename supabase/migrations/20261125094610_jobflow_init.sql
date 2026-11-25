-- Jobflow multi-tenant schema.
-- Authorization lives in app_metadata (role, tenant_id), never user_metadata.
-- Helper functions sit in app_private so they are not exposed by the Data API.
-- Keep app_private out of the exposed schemas list.

create schema if not exists app_private;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  trade text not null default 'HVAC',
  plan text not null default 'starter' check (plan in ('starter', 'pro')),
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  timezone text not null default 'America/Chicago',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete cascade,
  role text not null check (role in ('owner', 'dispatcher', 'technician', 'customer', 'superadmin')),
  full_name text not null default '',
  email text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table public.technicians (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  phone text not null default '',
  color text not null default '#1f6f78',
  skills text[] not null default '{}',
  lat double precision not null default 0,
  lng double precision not null default 0
);

create table public.customers (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  lat double precision not null default 0,
  lng double precision not null default 0,
  notes text not null default ''
);

create table public.services (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_min integer not null check (duration_min between 15 and 480),
  price_cents integer not null check (price_cents >= 0),
  category text not null default 'General',
  active boolean not null default true
);

create table public.jobs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  customer_id bigint not null references public.customers (id) on delete restrict,
  service_id bigint not null references public.services (id) on delete restrict,
  technician_id bigint references public.technicians (id) on delete set null,
  status text not null check (status in ('requested', 'scheduled', 'en_route', 'on_site', 'complete', 'invoiced')),
  reference text not null,
  title text not null,
  description text not null default '',
  address text not null default '',
  lat double precision not null default 0,
  lng double precision not null default 0,
  window_start timestamptz not null,
  window_end timestamptz not null,
  price_cents integer not null check (price_cents >= 0),
  invoice_status text not null default 'none' check (invoice_status in ('none', 'open', 'paid')),
  paid_at timestamptz,
  summary text,
  summary_provider text check (summary_provider in ('groq', 'gemini', 'mock')),
  created_at timestamptz not null default now(),
  unique (tenant_id, reference)
);

create table public.job_notes (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.jobs (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create table public.job_photos (
  id bigint generated always as identity primary key,
  job_id bigint not null references public.jobs (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  href text not null default '/',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.message_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  job_id bigint references public.jobs (id) on delete set null,
  channel text not null check (channel in ('email', 'sms')),
  recipient text not null,
  subject text not null default '',
  body text not null,
  kind text not null check (kind in ('assignment', 'reminder', 'booking', 'payment')),
  created_at timestamptz not null default now()
);

create table public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  job_id bigint references public.jobs (id) on delete cascade,
  plan text check (plan in ('starter', 'pro')),
  amount_cents integer not null check (amount_cents >= 0),
  label text not null default '',
  status text not null default 'open' check (status in ('open', 'paid')),
  created_at timestamptz not null default now()
);

create index tenants_slug_idx on public.tenants (slug);
create index profiles_tenant_id_idx on public.profiles (tenant_id);
create index technicians_tenant_id_idx on public.technicians (tenant_id);
create index technicians_user_id_idx on public.technicians (user_id);
create index customers_tenant_id_idx on public.customers (tenant_id);
create index customers_user_id_idx on public.customers (user_id);
create index customers_tenant_email_idx on public.customers (tenant_id, email);
create index services_tenant_id_idx on public.services (tenant_id);
create index jobs_tenant_window_idx on public.jobs (tenant_id, window_start);
create index jobs_tenant_status_idx on public.jobs (tenant_id, status);
create index jobs_customer_id_idx on public.jobs (customer_id);
create index jobs_service_id_idx on public.jobs (service_id);
create index jobs_technician_id_idx on public.jobs (technician_id);
create index jobs_unassigned_idx on public.jobs (tenant_id, window_start)
  where technician_id is null and status in ('requested', 'scheduled');
create index job_notes_job_id_idx on public.job_notes (job_id);
create index job_notes_tenant_id_idx on public.job_notes (tenant_id);
create index job_photos_job_id_idx on public.job_photos (job_id);
create index job_photos_tenant_id_idx on public.job_photos (tenant_id);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_tenant_id_idx on public.notifications (tenant_id);
create index message_logs_tenant_created_idx on public.message_logs (tenant_id, created_at desc);
create index message_logs_job_id_idx on public.message_logs (job_id);
create index checkout_sessions_tenant_id_idx on public.checkout_sessions (tenant_id);
create index checkout_sessions_job_id_idx on public.checkout_sessions (job_id);

create or replace function app_private.actor_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function app_private.actor_tenant()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tenant_id from public.profiles where id = (select auth.uid())
$$;

revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;
revoke all on function app_private.actor_role() from public, anon;
revoke all on function app_private.actor_tenant() from public, anon;
grant execute on function app_private.actor_role() to authenticated;
grant execute on function app_private.actor_tenant() to authenticated;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, tenant_id, role, full_name, email, phone)
  values (
    new.id,
    nullif(new.raw_app_meta_data ->> 'tenant_id', '')::uuid,
    coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'customer'),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    coalesce(new.phone, '')
  );
  return new;
end;
$$;

revoke all on function app_private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.technicians enable row level security;
alter table public.customers enable row level security;
alter table public.services enable row level security;
alter table public.jobs enable row level security;
alter table public.job_notes enable row level security;
alter table public.job_photos enable row level security;
alter table public.notifications enable row level security;
alter table public.message_logs enable row level security;
alter table public.checkout_sessions enable row level security;

alter table public.tenants force row level security;
alter table public.profiles force row level security;
alter table public.technicians force row level security;
alter table public.customers force row level security;
alter table public.services force row level security;
alter table public.jobs force row level security;
alter table public.job_notes force row level security;
alter table public.job_photos force row level security;
alter table public.notifications force row level security;
alter table public.message_logs force row level security;
alter table public.checkout_sessions force row level security;

create policy tenants_select on public.tenants
for select to authenticated
using (
  id = (select app_private.actor_tenant())
  or (select app_private.actor_role()) = 'superadmin'
);

create policy tenants_update_owner on public.tenants
for update to authenticated
using (
  id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) = 'owner'
)
with check (
  id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) = 'owner'
);

create policy profiles_select on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or (select app_private.actor_role()) = 'superadmin'
  or (
    tenant_id = (select app_private.actor_tenant())
    and (select app_private.actor_role()) in ('owner', 'dispatcher')
  )
);

create policy technicians_select on public.technicians
for select to authenticated
using (
  (select app_private.actor_role()) = 'superadmin'
  or tenant_id = (select app_private.actor_tenant())
);

create policy technicians_write on public.technicians
for all to authenticated
using (
  tenant_id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) = 'owner'
)
with check (
  tenant_id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) = 'owner'
);

create policy customers_select on public.customers
for select to authenticated
using (
  (select app_private.actor_role()) = 'superadmin'
  or user_id = (select auth.uid())
  or (
    tenant_id = (select app_private.actor_tenant())
    and (select app_private.actor_role()) in ('owner', 'dispatcher', 'technician')
  )
);

create policy customers_write on public.customers
for all to authenticated
using (
  tenant_id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) in ('owner', 'dispatcher')
)
with check (
  tenant_id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) in ('owner', 'dispatcher')
);

create policy services_select on public.services
for select to authenticated
using (
  (select app_private.actor_role()) = 'superadmin'
  or tenant_id = (select app_private.actor_tenant())
);

create policy services_write on public.services
for all to authenticated
using (
  tenant_id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) in ('owner', 'dispatcher')
)
with check (
  tenant_id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) in ('owner', 'dispatcher')
);

create policy jobs_select on public.jobs
for select to authenticated
using (
  (select app_private.actor_role()) = 'superadmin'
  or (
    tenant_id = (select app_private.actor_tenant())
    and (
      (select app_private.actor_role()) in ('owner', 'dispatcher')
      or (
        (select app_private.actor_role()) = 'technician'
        and technician_id in (
          select id from public.technicians where user_id = (select auth.uid())
        )
      )
      or (
        (select app_private.actor_role()) = 'customer'
        and customer_id in (
          select id from public.customers where user_id = (select auth.uid())
        )
      )
    )
  )
);

create policy jobs_office_write on public.jobs
for all to authenticated
using (
  tenant_id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) in ('owner', 'dispatcher')
)
with check (
  tenant_id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) in ('owner', 'dispatcher')
);

create policy jobs_tech_update on public.jobs
for update to authenticated
using (
  (select app_private.actor_role()) = 'technician'
  and technician_id in (select id from public.technicians where user_id = (select auth.uid()))
)
with check (
  (select app_private.actor_role()) = 'technician'
  and technician_id in (select id from public.technicians where user_id = (select auth.uid()))
);

create policy notes_select on public.job_notes
for select to authenticated
using (
  (select app_private.actor_role()) = 'superadmin'
  or job_id in (select id from public.jobs)
);

create policy notes_insert on public.job_notes
for insert to authenticated
with check (
  tenant_id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) in ('owner', 'dispatcher', 'technician')
  and job_id in (select id from public.jobs)
);

create policy photos_select on public.job_photos
for select to authenticated
using (
  (select app_private.actor_role()) = 'superadmin'
  or job_id in (select id from public.jobs)
);

create policy photos_insert on public.job_photos
for insert to authenticated
with check (
  tenant_id = (select app_private.actor_tenant())
  and (select app_private.actor_role()) in ('owner', 'dispatcher', 'technician')
  and job_id in (select id from public.jobs)
);

create policy notifications_select on public.notifications
for select to authenticated
using (user_id = (select auth.uid()));

create policy notifications_update on public.notifications
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy messages_select on public.message_logs
for select to authenticated
using (
  (select app_private.actor_role()) = 'superadmin'
  or (
    tenant_id = (select app_private.actor_tenant())
    and (select app_private.actor_role()) in ('owner', 'dispatcher')
  )
);

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on public.checkout_sessions from authenticated, anon;
revoke all on all tables in schema public from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'job-photos',
  'job-photos',
  false,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy job_photos_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'job-photos'
  and (
    (select app_private.actor_role()) = 'superadmin'
    or (storage.foldername(name))[1] = (select app_private.actor_tenant())::text
  )
);

create policy job_photos_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[1] = (select app_private.actor_tenant())::text
  and (select app_private.actor_role()) in ('owner', 'dispatcher', 'technician')
);

create policy job_photos_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[1] = (select app_private.actor_tenant())::text
  and (select app_private.actor_role()) in ('owner', 'dispatcher', 'technician')
)
with check (
  bucket_id = 'job-photos'
  and (storage.foldername(name))[1] = (select app_private.actor_tenant())::text
);
