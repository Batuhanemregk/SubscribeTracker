"""
Domain entities for subscription tracking.
Mirrors the .NET domain but in Python for worker processing.
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    PAUSED = "paused"
    PENDING_REVIEW = "pending_review"


class Cadence(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    UNKNOWN = "unknown"


class ExtractionMethod(str, Enum):
    RULE = "rule"
    LLM = "llm"
    MANUAL = "manual"


class EventType(str, Enum):
    CHARGE = "charge"
    RENEWAL = "renewal"
    CANCELLATION = "cancellation"
    TRIAL_START = "trial_start"
    TRIAL_END = "trial_end"
    PRICE_CHANGE = "price_change"


@dataclass
class ExtractionResult:
    """Result from rule or LLM extraction."""

    merchant_name: str
    event_type: EventType
    confidence: float
    reason: str  # Explainable AI - why we inferred this (no PII)
    extraction_method: ExtractionMethod

    amount: Optional[float] = None
    currency: Optional[str] = None
    cadence: Cadence = Cadence.UNKNOWN
    next_billing_date: Optional[date] = None
    merchant_domain: Optional[str] = None

    # Source tracking for idempotency
    provider_message_id: Optional[str] = None
    email_date: Optional[datetime] = None


@dataclass
class Subscription:
    """Subscription entity for worker processing."""

    id: UUID = field(default_factory=uuid4)
    user_id: UUID = field(default_factory=uuid4)
    merchant_name: str = ""
    merchant_domain: Optional[str] = None
    amount: Optional[float] = None
    currency: str = "USD"
    cadence: Cadence = Cadence.UNKNOWN
    next_billing_date: Optional[date] = None
    last_billing_date: Optional[date] = None
    status: SubscriptionStatus = SubscriptionStatus.PENDING_REVIEW
    confidence_score: float = 0.0
    extraction_method: ExtractionMethod = ExtractionMethod.RULE
    reason_summary: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class SubscriptionEvent:
    """Event extracted from an email."""

    id: UUID = field(default_factory=uuid4)
    subscription_id: UUID = field(default_factory=uuid4)
    provider_message_id: str = ""
    email_date: datetime = field(default_factory=datetime.utcnow)
    event_type: EventType = EventType.CHARGE
    amount: Optional[float] = None
    currency: Optional[str] = None
    reason_code: str = ""
    confidence_score: float = 0.0
    extraction_method: ExtractionMethod = ExtractionMethod.RULE
    created_at: datetime = field(default_factory=datetime.utcnow)
