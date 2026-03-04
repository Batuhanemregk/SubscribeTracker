# Supabase Backend

All backend logic for SubscribeTracker runs through Supabase (Auth, PostgreSQL, Edge Functions).

## Structure

```
supabase/
├── schema.sql                        # Main database schema + RLS policies
└── functions/
    ├── extract-subscriptions/        # AI: detect subscriptions from email snippets
    ├── extract-bank-statement/       # AI: parse bank statements (Pro feature)
    └── exchange-rates/               # Currency exchange rate API
```

## Database Tables

- **users** — Profile, country, currency, pro status
- **subscriptions** — User subscriptions (FK to users, cascade delete)
- **service_catalog** — Read-only catalog of known services with JSONB prices/plans

## RLS Rules

All tables have Row Level Security enabled:
- Users can only read/update their own profile
- Users can only CRUD their own subscriptions
- Service catalog is readable by all authenticated users

## Edge Functions

Edge Functions use Deno runtime (TypeScript). They proxy OpenAI GPT-4o-mini for AI features.

### Commands

```bash
supabase start                    # Start local Supabase
supabase functions serve          # Serve Edge Functions locally
supabase db push                  # Push schema changes
supabase functions deploy <name>  # Deploy a specific function
```

## Privacy

- Never store raw email content in any table
- Only derived data: merchant, amount, cadence, dates, confidence
- User delete = cascade delete all related data
