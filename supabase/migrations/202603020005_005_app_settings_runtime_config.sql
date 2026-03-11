create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.profiles(id)
);

insert into public.app_settings (key, value)
values
  ('nlp_provider', to_jsonb('fastapi'::text)),
  ('nlp_api_key', to_jsonb(''::text)),
  ('nlp_threshold', to_jsonb(0.85)),
  ('nlp_auto_route', to_jsonb(true))
on conflict (key) do nothing;
