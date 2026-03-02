create extension if not exists pgcrypto;

update public.ticket_access_tokens
set token_hash = encode(digest(token_hash, 'sha256'), 'hex')
where token_hash like 'TRK-%';
