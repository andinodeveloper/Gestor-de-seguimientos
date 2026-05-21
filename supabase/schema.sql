create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizational_unit text not null default '',
  responsible_name text not null default '',
  report_date date not null,
  owner_id uuid not null references public.profiles (id),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id)
);

create table if not exists public.follow_up_documents (
  id uuid primary key default gen_random_uuid(),
  follow_up_id uuid not null references public.follow_ups (id) on delete cascade,
  name text not null,
  status_code text not null,
  status_label text not null,
  progress_percent integer not null default 0,
  notes text not null default '',
  sort_order integer not null default 0
);

create table if not exists public.follow_up_activities (
  id uuid primary key default gen_random_uuid(),
  follow_up_id uuid not null references public.follow_ups (id) on delete cascade,
  name text not null,
  frequency text not null check (frequency in ('Diaria', 'Semanal', 'Quincenal', 'Mensual')),
  priority text not null check (priority in ('Baja', 'Media', 'Alta', 'Critica')),
  status text not null check (status in ('Pendiente', 'En Proceso', 'Completado')),
  notes text not null default '',
  sort_order integer not null default 0
);

create table if not exists public.follow_up_projects (
  id uuid primary key default gen_random_uuid(),
  follow_up_id uuid not null references public.follow_ups (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.follow_up_projects (id) on delete cascade,
  column_key text not null check (column_key in ('todo', 'doing', 'done')),
  content text not null,
  sort_order integer not null default 0
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  payload_json jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute procedure public.touch_updated_at();

drop trigger if exists set_follow_ups_updated_at on public.follow_ups;
create trigger set_follow_ups_updated_at
before update on public.follow_ups
for each row
execute procedure public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.app_is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_active from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_edit_follow_ups()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.app_is_active() and public.app_role() in ('admin', 'editor');
$$;

alter table public.profiles enable row level security;
alter table public.follow_ups enable row level security;
alter table public.follow_up_documents enable row level security;
alter table public.follow_up_activities enable row level security;
alter table public.follow_up_projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (public.app_is_active() and (id = auth.uid() or public.app_role() = 'admin'));

drop policy if exists "profiles_update_admin_only" on public.profiles;
create policy "profiles_update_admin_only"
on public.profiles
for update
to authenticated
using (public.app_is_active() and public.app_role() = 'admin')
with check (public.app_is_active() and public.app_role() = 'admin');

drop policy if exists "profiles_insert_admin_only" on public.profiles;
create policy "profiles_insert_admin_only"
on public.profiles
for insert
to authenticated
with check (public.app_is_active() and public.app_role() = 'admin');

drop policy if exists "follow_ups_read_authenticated" on public.follow_ups;
create policy "follow_ups_read_authenticated"
on public.follow_ups
for select
to authenticated
using (public.app_is_active());

drop policy if exists "follow_ups_write_editors" on public.follow_ups;
create policy "follow_ups_write_editors"
on public.follow_ups
for all
to authenticated
using (public.can_edit_follow_ups())
with check (public.can_edit_follow_ups());

drop policy if exists "follow_up_documents_read_authenticated" on public.follow_up_documents;
create policy "follow_up_documents_read_authenticated"
on public.follow_up_documents
for select
to authenticated
using (public.app_is_active());

drop policy if exists "follow_up_documents_write_editors" on public.follow_up_documents;
create policy "follow_up_documents_write_editors"
on public.follow_up_documents
for all
to authenticated
using (public.can_edit_follow_ups())
with check (public.can_edit_follow_ups());

drop policy if exists "follow_up_activities_read_authenticated" on public.follow_up_activities;
create policy "follow_up_activities_read_authenticated"
on public.follow_up_activities
for select
to authenticated
using (public.app_is_active());

drop policy if exists "follow_up_activities_write_editors" on public.follow_up_activities;
create policy "follow_up_activities_write_editors"
on public.follow_up_activities
for all
to authenticated
using (public.can_edit_follow_ups())
with check (public.can_edit_follow_ups());

drop policy if exists "follow_up_projects_read_authenticated" on public.follow_up_projects;
create policy "follow_up_projects_read_authenticated"
on public.follow_up_projects
for select
to authenticated
using (public.app_is_active());

drop policy if exists "follow_up_projects_write_editors" on public.follow_up_projects;
create policy "follow_up_projects_write_editors"
on public.follow_up_projects
for all
to authenticated
using (public.can_edit_follow_ups())
with check (public.can_edit_follow_ups());

drop policy if exists "project_tasks_read_authenticated" on public.project_tasks;
create policy "project_tasks_read_authenticated"
on public.project_tasks
for select
to authenticated
using (public.app_is_active());

drop policy if exists "project_tasks_write_editors" on public.project_tasks;
create policy "project_tasks_write_editors"
on public.project_tasks
for all
to authenticated
using (public.can_edit_follow_ups())
with check (public.can_edit_follow_ups());

drop policy if exists "audit_events_select_admin" on public.audit_events;
create policy "audit_events_select_admin"
on public.audit_events
for select
to authenticated
using (public.app_is_active() and public.app_role() = 'admin');

drop policy if exists "audit_events_insert_authenticated" on public.audit_events;
create policy "audit_events_insert_authenticated"
on public.audit_events
for insert
to authenticated
with check (public.app_is_active() and actor_id = auth.uid());

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.follow_ups to authenticated;
grant select, insert, update, delete on public.follow_up_documents to authenticated;
grant select, insert, update, delete on public.follow_up_activities to authenticated;
grant select, insert, update, delete on public.follow_up_projects to authenticated;
grant select, insert, update, delete on public.project_tasks to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.audit_events to authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.app_role() to authenticated, service_role;
grant execute on function public.app_is_active() to authenticated, service_role;
grant execute on function public.can_edit_follow_ups() to authenticated, service_role;
