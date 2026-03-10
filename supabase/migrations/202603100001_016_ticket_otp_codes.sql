-- Migration: Create ticket_otp_codes table for guest OTP verification on ticket tracking
-- OTP codes are hashed (SHA-256) before storage; only the hash is persisted.

create table if not exists public.ticket_otp_codes (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets(id) on delete cascade,
  otp_hash    text not null,
  attempts    integer not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

-- Index for fast lookup by ticket + expiry
create index if not exists idx_ticket_otp_codes_ticket_id_expires
  on public.ticket_otp_codes (ticket_id, expires_at);

-- Enable RLS (service-role key bypasses RLS, so no policies needed for API routes)
alter table public.ticket_otp_codes enable row level security;
