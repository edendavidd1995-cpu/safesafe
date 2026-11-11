-- iPhone push notifications: device tokens + trigger that calls the `push` edge function
create extension if not exists pg_net with schema extensions;

create table if not exists public.device_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'ios' check (platform in ('ios','android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists device_tokens_user_idx on public.device_tokens(user_id);
alter table public.device_tokens enable row level security;

create or replace function public.register_device(p_token text, p_platform text default 'ios')
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_token is null or length(p_token) < 20 or length(p_token) > 400 then raise exception 'bad_token'; end if;
  insert into device_tokens(token, user_id, platform) values (p_token, auth.uid(), coalesce(p_platform,'ios'))
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;

create or replace function public.unregister_device(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from device_tokens where token = p_token and user_id = auth.uid();
end $$;

revoke all on function public.register_device(text,text) from public, anon;
revoke all on function public.unregister_device(text) from public, anon;
grant execute on function public.register_device(text,text) to authenticated;
grant execute on function public.unregister_device(text) to authenticated;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'push_hook_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'push_hook_secret');
  end if;
end $$;

create or replace function public.notify_push()
returns trigger language plpgsql security definer set search_path = public as $$
declare s text;
begin
  if not exists (select 1 from device_tokens where user_id = new.user_id) then return new; end if;
  select decrypted_secret into s from vault.decrypted_secrets where name = 'push_hook_secret';
  perform net.http_post(
    url := 'https://wcehymtzglfokcgdrlcs.supabase.co/functions/v1/push',
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type','application/json','x-hook-secret', s)
  );
  return new;
exception when others then
  return new;
end $$;
revoke all on function public.notify_push() from public, anon, authenticated;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications
for each row execute function public.notify_push();

create or replace function public.check_push_secret(p_secret text)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'push_hook_secret' and decrypted_secret = p_secret);
$$;
revoke all on function public.check_push_secret(text) from public, anon, authenticated;
grant execute on function public.check_push_secret(text) to service_role;
