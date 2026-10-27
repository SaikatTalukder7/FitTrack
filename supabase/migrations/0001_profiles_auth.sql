-- FitTrack migration 0001 (Step 3): profiles, roles, signup trigger, and RLS.
-- Run once in the Supabase SQL Editor. Step 4 adds migrations 0002 onward.
-- This file never stores passwords. Passwords live in Supabase's auth.users table.

-- 1. Profiles table (one row per auth user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- 2. Helper: is the current signed-in user an admin?
-- SECURITY DEFINER lets the policy read profiles without recursing into RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

-- 3. Create a profile for every new auth user.
-- The role is always 'customer'. Signup metadata cannot set a role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    'customer'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 5. Row Level Security
alter table public.profiles enable row level security;

-- Column-level privileges: API users may read the table and update only full_name.
-- The role column is not writable by the API, so customers cannot promote themselves.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_name" on public.profiles;
create policy "profiles_update_own_name"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No insert or delete policies for API users. The signup trigger inserts rows,
-- and deleting an auth user removes the profile through the cascade.

-- 6. Admin promotion (trusted operator only, run manually in the SQL Editor):
--   update public.profiles set role = 'admin' where id = '<auth-user-uuid>';
-- Step 4 adds a secure, audited admin function for role management.
