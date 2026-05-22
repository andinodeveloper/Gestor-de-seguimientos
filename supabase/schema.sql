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

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizational_unit text not null default '',
  owner_id uuid not null references public.profiles (id),
  status text not null default 'active' check (status in ('active', 'archived')),
  status_code text not null,
  status_label text not null,
  progress_percent integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id)
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizational_unit text not null default '',
  owner_id uuid not null references public.profiles (id),
  status text not null default 'active' check (status in ('active', 'archived')),
  frequency text not null check (frequency in ('Diaria', 'Semanal', 'Quincenal', 'Mensual')),
  priority text not null check (priority in ('Baja', 'Media', 'Alta', 'Critica')),
  activity_status text not null check (activity_status in ('Pendiente', 'En Proceso', 'Completado')),
  notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizational_unit text not null default '',
  owner_id uuid not null references public.profiles (id),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id)
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
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

do $$
begin
  if to_regclass('public.follow_up_documents') is not null and to_regclass('public.follow_ups') is not null then
    insert into public.documents (
      id,
      title,
      organizational_unit,
      owner_id,
      status,
      status_code,
      status_label,
      progress_percent,
      notes,
      created_at,
      updated_at,
      updated_by
    )
    select
      legacy.id,
      coalesce(nullif(trim(legacy.name), ''), follow_up.title),
      follow_up.organizational_unit,
      follow_up.owner_id,
      follow_up.status,
      legacy.status_code,
      legacy.status_label,
      coalesce(legacy.progress_percent, 0),
      coalesce(legacy.notes, ''),
      follow_up.created_at,
      follow_up.updated_at,
      follow_up.updated_by
    from public.follow_up_documents legacy
    join public.follow_ups follow_up on follow_up.id = legacy.follow_up_id
    on conflict (id) do update
      set title = excluded.title,
          organizational_unit = excluded.organizational_unit,
          owner_id = excluded.owner_id,
          status = excluded.status,
          status_code = excluded.status_code,
          status_label = excluded.status_label,
          progress_percent = excluded.progress_percent,
          notes = excluded.notes,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by;
  end if;

  if to_regclass('public.follow_up_activities') is not null and to_regclass('public.follow_ups') is not null then
    insert into public.activities (
      id,
      title,
      organizational_unit,
      owner_id,
      status,
      frequency,
      priority,
      activity_status,
      notes,
      created_at,
      updated_at,
      updated_by
    )
    select
      legacy.id,
      coalesce(nullif(trim(legacy.name), ''), follow_up.title),
      follow_up.organizational_unit,
      follow_up.owner_id,
      follow_up.status,
      legacy.frequency,
      legacy.priority,
      legacy.status,
      coalesce(legacy.notes, ''),
      follow_up.created_at,
      follow_up.updated_at,
      follow_up.updated_by
    from public.follow_up_activities legacy
    join public.follow_ups follow_up on follow_up.id = legacy.follow_up_id
    on conflict (id) do update
      set title = excluded.title,
          organizational_unit = excluded.organizational_unit,
          owner_id = excluded.owner_id,
          status = excluded.status,
          frequency = excluded.frequency,
          priority = excluded.priority,
          activity_status = excluded.activity_status,
          notes = excluded.notes,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by;
  end if;

  if to_regclass('public.follow_up_projects') is not null and to_regclass('public.follow_ups') is not null then
    insert into public.projects (
      id,
      title,
      organizational_unit,
      owner_id,
      status,
      created_at,
      updated_at,
      updated_by
    )
    select
      legacy.id,
      coalesce(nullif(trim(legacy.name), ''), follow_up.title),
      follow_up.organizational_unit,
      follow_up.owner_id,
      follow_up.status,
      follow_up.created_at,
      follow_up.updated_at,
      follow_up.updated_by
    from public.follow_up_projects legacy
    join public.follow_ups follow_up on follow_up.id = legacy.follow_up_id
    on conflict (id) do update
      set title = excluded.title,
          organizational_unit = excluded.organizational_unit,
          owner_id = excluded.owner_id,
          status = excluded.status,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.project_tasks') is not null then
    if exists (
      select 1
      from pg_constraint
      where conrelid = 'public.project_tasks'::regclass
        and conname = 'project_tasks_project_id_fkey'
    ) then
      alter table public.project_tasks
        drop constraint project_tasks_project_id_fkey;
    end if;

    alter table public.project_tasks
      add constraint project_tasks_project_id_fkey
      foreign key (project_id) references public.projects (id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end
$$;

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

drop trigger if exists set_documents_updated_at on public.documents;
create trigger set_documents_updated_at
before update on public.documents
for each row
execute procedure public.touch_updated_at();

drop trigger if exists set_activities_updated_at on public.activities;
create trigger set_activities_updated_at
before update on public.activities
for each row
execute procedure public.touch_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
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

create or replace function public.can_edit_records()
returns boolean
language sql
stable
set search_path = public
as $$
  select public.app_is_active() and public.app_role() in ('admin', 'editor');
$$;

create or replace function public.can_manage_owned_record(record_owner_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select public.app_is_active()
    and (
      public.app_role() = 'admin'
      or (public.app_role() = 'editor' and auth.uid() = record_owner_id)
    );
$$;

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.activities enable row level security;
alter table public.projects enable row level security;
alter table public.project_tasks enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (public.app_is_active() and is_active = true);

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

drop policy if exists "documents_read_authenticated" on public.documents;
drop policy if exists "documents_write_editors" on public.documents;
create policy "documents_read_authenticated"
on public.documents
for select
to authenticated
using (public.app_is_active());

drop policy if exists "documents_insert_owned" on public.documents;
create policy "documents_insert_owned"
on public.documents
for insert
to authenticated
with check (public.can_edit_records() and owner_id = auth.uid());

drop policy if exists "documents_update_owned_or_admin" on public.documents;
create policy "documents_update_owned_or_admin"
on public.documents
for update
to authenticated
using (public.can_manage_owned_record(owner_id))
with check (public.can_manage_owned_record(owner_id));

drop policy if exists "documents_delete_owned_or_admin" on public.documents;
create policy "documents_delete_owned_or_admin"
on public.documents
for delete
to authenticated
using (public.can_manage_owned_record(owner_id));

drop policy if exists "activities_read_authenticated" on public.activities;
drop policy if exists "activities_write_editors" on public.activities;
create policy "activities_read_authenticated"
on public.activities
for select
to authenticated
using (public.app_is_active());

drop policy if exists "activities_insert_owned" on public.activities;
create policy "activities_insert_owned"
on public.activities
for insert
to authenticated
with check (public.can_edit_records() and owner_id = auth.uid());

drop policy if exists "activities_update_owned_or_admin" on public.activities;
create policy "activities_update_owned_or_admin"
on public.activities
for update
to authenticated
using (public.can_manage_owned_record(owner_id))
with check (public.can_manage_owned_record(owner_id));

drop policy if exists "activities_delete_owned_or_admin" on public.activities;
create policy "activities_delete_owned_or_admin"
on public.activities
for delete
to authenticated
using (public.can_manage_owned_record(owner_id));

drop policy if exists "projects_read_authenticated" on public.projects;
drop policy if exists "projects_write_editors" on public.projects;
create policy "projects_read_authenticated"
on public.projects
for select
to authenticated
using (public.app_is_active());

drop policy if exists "projects_insert_owned" on public.projects;
create policy "projects_insert_owned"
on public.projects
for insert
to authenticated
with check (public.can_edit_records() and owner_id = auth.uid());

drop policy if exists "projects_update_owned_or_admin" on public.projects;
create policy "projects_update_owned_or_admin"
on public.projects
for update
to authenticated
using (public.can_manage_owned_record(owner_id))
with check (public.can_manage_owned_record(owner_id));

drop policy if exists "projects_delete_owned_or_admin" on public.projects;
create policy "projects_delete_owned_or_admin"
on public.projects
for delete
to authenticated
using (public.can_manage_owned_record(owner_id));

drop policy if exists "project_tasks_read_authenticated" on public.project_tasks;
drop policy if exists "project_tasks_write_editors" on public.project_tasks;
create policy "project_tasks_read_authenticated"
on public.project_tasks
for select
to authenticated
using (public.app_is_active());

drop policy if exists "project_tasks_insert_owned_or_admin" on public.project_tasks;
create policy "project_tasks_insert_owned_or_admin"
on public.project_tasks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_tasks.project_id
      and public.can_manage_owned_record(projects.owner_id)
  )
);

drop policy if exists "project_tasks_update_owned_or_admin" on public.project_tasks;
create policy "project_tasks_update_owned_or_admin"
on public.project_tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_tasks.project_id
      and public.can_manage_owned_record(projects.owner_id)
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_tasks.project_id
      and public.can_manage_owned_record(projects.owner_id)
  )
);

drop policy if exists "project_tasks_delete_owned_or_admin" on public.project_tasks;
create policy "project_tasks_delete_owned_or_admin"
on public.project_tasks
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_tasks.project_id
      and public.can_manage_owned_record(projects.owner_id)
  )
);

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
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.activities to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_tasks to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert on public.audit_events to authenticated;
grant all on all tables in schema public to service_role;
grant execute on function public.app_role() to authenticated, service_role;
grant execute on function public.app_is_active() to authenticated, service_role;
grant execute on function public.can_edit_records() to authenticated, service_role;
grant execute on function public.can_manage_owned_record(uuid) to authenticated, service_role;
