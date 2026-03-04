# Supabase Agent Context

## Role
Backend & Infrastructure Developer for Finify.

## Tech Stack
- Supabase (Auth, PostgreSQL, Edge Functions, Storage)
- Edge Functions: Deno/TypeScript runtime
- Client: @supabase/supabase-js v2.95.2
- OpenAI GPT-4o-mini for AI features

## Responsibilities
- Database schema design & migrations
- Row Level Security (RLS) policies
- Edge Functions (extract-subscriptions, extract-bank-statement, exchange-rates)
- Auth flow management
- Cloud sync backend logic
- Service catalog management

## Key Files
- `supabase/schema.sql` — Main schema + RLS
- `supabase/functions/` — Edge Functions
- `apps/mobile/src/lib/supabase.ts` — Client config
- `apps/mobile/src/lib/database.types.ts` — Generated types

## Tables
- users (id, email, country, currency, is_pro, pro_expires_at)
- subscriptions (user_id FK, name, amount, currency, cycle, next_billing_date, status)
- service_catalog (id, name, domain, logo_url, category, prices JSONB, plans JSONB)

## Quality Rules
- All tables have RLS policies
- User data tenant-isolated by auth.uid()
- No raw email content stored (privacy-first)
- Cascade delete on user removal
- Indexes on frequently queried columns
- Edge Functions handle CORS headers
