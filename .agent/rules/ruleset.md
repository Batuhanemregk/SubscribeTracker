---
trigger: always_on
---

privacy-first

never-store-raw-email: never persist raw email subject/body/attachments in database, logs, analytics, or crash reports

derived-data-only: store only extracted subscription records, events, confidence scores, and minimal evidence

user-control-required: settings must include disconnect and delete-account-forget-me

delete-and-disconnect

disconnect-definition: revoke-access-remove-tokens-stop-sync

delete-account-definition: disconnect plus delete all derived data, tokens, job state, and local caches

delete-scope: device-storage, backend-database, caches, queues, logs (no pii), analytics identifiers where applicable

minimal-data-policy

forbidden-data: subject, full-body, full-from-address, full-to-address, attachments, order-ids, names, phone, address

allowed-data: provider-message-id, email-date, optional-from-domain, extracted-fields (merchant, amount, currency, cadence, next-billing-date), reason-codes, confidence

evidence-policy: do-not-store-raw-snippets; re-fetch from provider when user wants to view details

architecture-clean

layer-boundaries: domain, application, infrastructure, presentation

dependency-direction: domain-none; application-domain; infrastructure-application; presentation-application

provider-agnostic: all email access must go through email-provider interface; gmail is an adapter

extraction-pipeline

extractor-chain: rule-extractor then heuristic-extractor then llm-extractor then merge-dedupe

plugin-design: adding an extractor must not require changing existing extractors

subscription-and-events: emails produce events; events attach to a subscription entity

sync-strategy

initial-backfill-window: six-month-backfill on first connect

daily-incremental-window: scan last 48-to-72-hours daily with overlap

idempotency: process each provider-message-id once per user

catch-up-job: weekly scan last 7 days to recover from outages or quota issues

rules-engine

rules-as-yaml: rules live in rules/merchant/version.yaml

fixtures-required: every rule must have sanitized fixtures and expected outputs

version-and-rollback: activate rules via config; rollback by switching active version

no-pii-in-fixtures: fixtures must be synthetic or sanitized

llm-policy

privacy-minimization: send only masked, minimized snippets (max 20-to-40 relevant lines)

strict-json-schema: llm must output schema-locked json

confidence-gating: auto-add >= 0.85; review 0.60-to-0.85; ignore < 0.60

caching-and-budgets: cache by template-hash; enforce daily per-user and global limits

security-store-ready

oauth-pkce: enforce pkce on mobile oauth flow

secure-token-storage: mobile uses keychain-keystore; backend uses encryption-at-rest for refresh tokens

secrets-management: no secrets in repo; use env and secret manager in prod

rate-limits: enforce scanning and llm call limits per user

pii-redaction-logs: no email content in logs; redact patterns in all telemetry

ux-mvp

mandatory-screens: connect, scan-progress, review-queue, subscription-list, upcoming-payments, settings

mandatory-actions: approve-edit-reject, manual-add-edit-delete, disconnect, delete-account

transparency: show last-sync-time and scan-window

engineering-quality

monorepo-structure: apps/mobile and services/api and services/worker

api-versioning: api routes under /api/v1

typed-contracts: openapi is source of truth; generate client types

ci-gates: lint, format, unit-tests, rule-fixture-tests

migrations-required: database schema changes require migrations

english-only-project
all user-facing text in the app must be english only
all code comments variable names file names api responses error messages and logs must be english only
do not add turkish strings anywhere in the repository
exception this chat can be in turkish or english but the project output must remain english only

security-first-engineering
always design with a security mindset and choose the safer option when tradeoffs exist
apply least privilege for permissions and access scopes
never log secrets tokens or personal data
assume hostile environments and protect against token leakage mitm and device compromise
use secure storage on mobile and encryption at rest on backend
add rate limiting abuse protection and input validation by default

mobile-first-ios-android
always treat this as a mobile app for both ios and android
all flows and ui must be designed to work on both platforms
avoid platform-specific assumptions unless explicitly handled with conditional logic
test critical flows on both ios and android and ensure parity in features and behavior

codebase-hygiene-and-no-dead-code
when a feature is changed or replaced you must update the implementation everywhere it is used
if an old feature or approach is no longer used you must remove the old code paths and delete unused files
do not keep deprecated modules commented code unused components or legacy config in the repository
every change must include a quick sweep to remove unused imports routes endpoints feature flags and assets
keep the repository lean if something is not referenced by the current build it should not exist
when removing code ensure tests and documentation are updated accordingly

future-work-tracking
after-every-task-check-future-work: at the end of each significant change or feature implementation, check and update future-work.md
future-work-location: always use a single file at repo root named future-work.md
append-not-replace: add new items to appropriate priority section, never delete existing items
mark-done-not-delete: when completing an item, move it to COMPLETED section with [DONE] status
entry-format-required: each entry must include date, area, current-state, why-it-matters, next-action
priority-sections: use 🔴 HIGH PRIORITY, 🟡 MEDIUM PRIORITY, 🟢 LOW PRIORITY, ✅ COMPLETED
track-tech-debt: record any shortcuts, temporary solutions, or known limitations
track-dependencies: note if a future item blocks or is blocked by another item
review-on-new-conversation: at start of new conversation, read future-work.md to understand pending work
