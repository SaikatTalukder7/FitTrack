-- 1. Profiles table (one row per auth user)
create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    full_name text not null default '' check (char_length(full_name) <= 120),
    role text not null default 'customer' check (role in ('admin', 'customer')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- 2. Check if the current user is an admin
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

-- 3. Create a profile for every new auth(customer) user.
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

-- 4. Automatically update updated_at on profile changes
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

-- 5. Enable RLS and control profile access
alter table public.profiles enable row level security;

-- Users can update only their full_name, not their role
revoke all on public.profiles from anon, authenticated;

grant select on public.profiles to authenticated;

grant update (full_name) on public.profiles to authenticated;

-- Users can view their own profile; admins can view all profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;

create policy "profiles_select_own_or_admin" on public.profiles for
select to authenticated using (
        id = auth.uid ()
        or public.is_admin ()
    );

-- Users can update only their own profile
drop policy if exists "profiles_update_own_name" on public.profiles;

create policy "profiles_update_own_name" on public.profiles for
update to authenticated using (id = auth.uid ())
with
    check (id = auth.uid ());

-- No insert or delete policies for API users. The signup trigger inserts rows,
-- and deleting an auth user removes the profile through the cascade.

-- 6. Admin promotion (trusted operator only, run manually in the SQL Editor):
--   update public.profiles set role = 'admin' where id = '<auth-user-uuid>';
-- Step 4 adds a secure, audited admin function for role management.