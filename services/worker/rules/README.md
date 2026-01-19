# Extraction Rules

This directory contains YAML rule definitions for known merchants.

## Structure

```
rules/
└── merchants/
    └── v1/           # Version 1 rules
        ├── netflix.yaml
        ├── spotify.yaml
        └── apple.yaml
```

## Rule Format

```yaml
version: "1"
merchant:
  name: "Netflix"
  domain: "netflix.com"

patterns:
  - type: charge # Event type: charge, renewal, cancellation, trial_start, trial_end
    from_domain: "netflix.com"
    subject_patterns:
      - "Your Netflix.*payment"
      - "Netflix.*receipt"
    amount_regex: '\$(\d+\.?\d*)' # Capture group 1 = amount
    confidence: 0.95

defaults:
  cadence: monthly
  currency: USD
```

## Versioning

- Rules are versioned in directories (`v1`, `v2`, etc.)
- Active version is configured in settings
- Rollback by switching `RULES_VERSION` config
- All versions must pass fixture tests before deployment

## Adding New Rules

1. Create `merchantname.yaml` in the active version directory
2. Add corresponding fixture tests in `fixtures/`
3. Run `pytest tests/extractors/test_rules.py`
4. Submit for review

## Fixtures

Every rule must have sanitized test fixtures:

```yaml
# fixtures/netflix/charge_v1.yaml
input:
  from_domain: "mailer.netflix.com"
  snippet: "Thank you for your payment of $15.99"

expected:
  merchant_name: "Netflix"
  event_type: "charge"
  amount: 15.99
  confidence: 0.95
```

**No PII in fixtures** - use synthetic/sanitized data only.
