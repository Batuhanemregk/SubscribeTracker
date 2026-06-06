---
paths:
  - "supabase/**"
  - "apps/mobile/src/lib/supabase.ts"
  - "apps/mobile/src/lib/database.types.ts"
  - "apps/mobile/src/services/SyncService.ts"
---
# Supabase rules

- Supabase is the only backend: Postgres + Auth + Edge Functions. There is no self-hosted API.
- Every new table has Row Level Security (RLS) enabled, with at least one policy in the same migration / SQL file.
- The service-role key is used ONLY inside `supabase/functions/` (Edge Functions, Deno). Never reference it in client code.
- After any schema change, regenerate types: `npx supabase gen types typescript --project-id wsymhdlrrftewkwyzzlf > apps/mobile/src/lib/database.types.ts`.
- Edge Functions are the backend logic (extract-subscriptions, extract-bank-statement, exchange-rates). Keep extraction privacy-first: never persist raw email/document content, only derived fields + confidence.
- Client uses the anon key via `EXPO_PUBLIC_SUPABASE_ANON_KEY`; the auth session persists in AsyncStorage with `detectSessionInUrl: false` (React Native).
- Deploy functions with `npx supabase functions deploy <name>`; set function secrets with `supabase secrets set` — never commit them.
