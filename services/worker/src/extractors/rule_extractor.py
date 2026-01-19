"""
Rule-based extractor using YAML rule definitions.
Matches known merchants with high confidence.
"""
import re
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Optional

import yaml

from src.domain.entities import Cadence, EventType, ExtractionMethod, ExtractionResult
from src.providers.base import EmailMetadata


@dataclass
class RulePattern:
    """A single rule pattern for matching emails."""

    event_type: EventType
    from_domain: str
    subject_patterns: list[str]
    amount_regex: Optional[str] = None
    confidence: float = 0.9


@dataclass
class MerchantRule:
    """Rule definition for a merchant."""

    version: str
    merchant_name: str
    merchant_domain: str
    patterns: list[RulePattern]
    defaults: dict


class RuleExtractor:
    """
    YAML-based rule extraction for known merchants.
    Rules are versioned and can be rolled back via config.
    """

    def __init__(self, rules_dir: Path):
        self.rules_dir = rules_dir
        self.rules: dict[str, MerchantRule] = {}
        self._load_rules()

    def _load_rules(self) -> None:
        """Load all YAML rules from the rules directory."""
        if not self.rules_dir.exists():
            return

        for rule_file in self.rules_dir.glob("**/*.yaml"):
            try:
                with open(rule_file) as f:
                    data = yaml.safe_load(f)

                if not data:
                    continue

                merchant = data.get("merchant", {})
                rule = MerchantRule(
                    version=data.get("version", "1"),
                    merchant_name=merchant.get("name", ""),
                    merchant_domain=merchant.get("domain", ""),
                    patterns=self._parse_patterns(data.get("patterns", [])),
                    defaults=data.get("defaults", {}),
                )

                # Index by domain for fast lookup
                self.rules[rule.merchant_domain] = rule

            except Exception:
                # Skip invalid rule files
                continue

    def _parse_patterns(self, patterns_data: list) -> list[RulePattern]:
        """Parse pattern definitions from YAML."""
        patterns = []
        for p in patterns_data:
            try:
                patterns.append(
                    RulePattern(
                        event_type=EventType(p.get("type", "charge")),
                        from_domain=p.get("from_domain", ""),
                        subject_patterns=p.get("subject_patterns", []),
                        amount_regex=p.get("amount_regex"),
                        confidence=p.get("confidence", 0.9),
                    )
                )
            except Exception:
                continue
        return patterns

    def extract(self, email: EmailMetadata, content: str) -> Optional[ExtractionResult]:
        """
        Try to extract subscription info using rules.
        Returns None if no rule matches.
        """
        if not email.from_domain:
            return None

        # Find rule by domain (check subdomains too)
        rule = self._find_rule(email.from_domain)
        if not rule:
            return None

        # Try each pattern
        for pattern in rule.patterns:
            if self._matches_pattern(pattern, email, content):
                return self._create_result(rule, pattern, email, content)

        return None

    def _find_rule(self, from_domain: str) -> Optional[MerchantRule]:
        """Find rule matching the from domain."""
        # Direct match
        if from_domain in self.rules:
            return self.rules[from_domain]

        # Check if it's a subdomain
        parts = from_domain.split(".")
        for i in range(len(parts) - 1):
            parent = ".".join(parts[i:])
            if parent in self.rules:
                return self.rules[parent]

        return None

    def _matches_pattern(
        self, pattern: RulePattern, email: EmailMetadata, content: str
    ) -> bool:
        """Check if email matches the pattern."""
        # Domain must match
        if pattern.from_domain and pattern.from_domain not in (email.from_domain or ""):
            return False

        # Check subject patterns against snippet (we don't store subject)
        combined_text = f"{email.snippet} {content}"
        for subject_pattern in pattern.subject_patterns:
            if re.search(subject_pattern, combined_text, re.IGNORECASE):
                return True

        return False

    def _create_result(
        self,
        rule: MerchantRule,
        pattern: RulePattern,
        email: EmailMetadata,
        content: str,
    ) -> ExtractionResult:
        """Create extraction result from matched rule."""
        amount = None
        if pattern.amount_regex:
            match = re.search(pattern.amount_regex, content)
            if match:
                try:
                    amount = float(match.group(1).replace(",", ""))
                except (ValueError, IndexError):
                    pass

        # Parse cadence from defaults
        cadence = Cadence.UNKNOWN
        if "cadence" in rule.defaults:
            try:
                cadence = Cadence(rule.defaults["cadence"])
            except ValueError:
                pass

        return ExtractionResult(
            merchant_name=rule.merchant_name,
            merchant_domain=rule.merchant_domain,
            event_type=pattern.event_type,
            amount=amount,
            currency=rule.defaults.get("currency", "USD"),
            cadence=cadence,
            confidence=pattern.confidence,
            reason=f"Matched {rule.merchant_name} billing pattern from {email.from_domain}",
            extraction_method=ExtractionMethod.RULE,
            provider_message_id=email.message_id,
            email_date=email.date,
        )
