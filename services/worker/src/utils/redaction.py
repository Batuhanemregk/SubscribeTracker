"""
PII redaction utilities for logging.
Ensures no sensitive data in logs per privacy requirements.
"""
import re


REDACTION_PATTERNS = [
    (re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"), "[EMAIL]"),
    (re.compile(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b"), "[CARD]"),
    (re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b"), "[PHONE]"),
    (re.compile(r"Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+"), "[TOKEN]"),
    (re.compile(r"refresh_token[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9\-_]+"), "refresh_token=[REDACTED]"),
    (re.compile(r"access_token[\"']?\s*[:=]\s*[\"']?[A-Za-z0-9\-_]+"), "access_token=[REDACTED]"),
]


def redact_pii(message: str) -> str:
    """Redact PII from log message."""
    if not message:
        return message

    result = message
    for pattern, replacement in REDACTION_PATTERNS:
        result = pattern.sub(replacement, result)

    return result


class RedactingProcessor:
    """Structlog processor that redacts PII from log messages."""

    def __call__(self, logger, method_name, event_dict):
        """Process log event and redact PII."""
        if "event" in event_dict:
            event_dict["event"] = redact_pii(str(event_dict["event"]))

        # Redact all string values
        for key, value in event_dict.items():
            if isinstance(value, str):
                event_dict[key] = redact_pii(value)

        return event_dict
