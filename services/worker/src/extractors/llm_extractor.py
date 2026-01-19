"""
LLM-based extractor for unknown/complex emails.
Uses OpenAI GPT-4o-mini with strict JSON schema output.
"""
import hashlib
import json
import re
from datetime import date
from typing import Optional

from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from src.config import settings
from src.domain.entities import Cadence, EventType, ExtractionMethod, ExtractionResult
from src.providers.base import EmailMetadata


class LLMExtractionSchema(BaseModel):
    """Strict JSON schema for LLM output."""

    merchant_name: str = Field(..., min_length=1, max_length=255)
    event_type: str = Field(..., pattern=r"^(charge|renewal|cancellation|trial_start|trial_end)$")
    amount: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = Field(None, pattern=r"^[A-Z]{3}$")
    cadence: str = Field(..., pattern=r"^(weekly|monthly|quarterly|yearly|unknown)$")
    next_billing_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    confidence: float = Field(..., ge=0, le=1)
    reason: str = Field(..., max_length=200)


LLM_EXTRACTION_PROMPT = """Extract subscription information from this email snippet.
Return ONLY valid JSON matching the schema below.

INPUT EMAIL (masked for privacy):
{masked_content}

SCHEMA:
{{
  "merchant_name": "string - company name",
  "event_type": "charge|renewal|cancellation|trial_start|trial_end",
  "amount": number or null,
  "currency": "3-letter code or null",
  "cadence": "weekly|monthly|quarterly|yearly|unknown",
  "next_billing_date": "YYYY-MM-DD or null",
  "confidence": 0.0-1.0 how confident you are,
  "reason": "1 sentence why you inferred this - no PII"
}}

RULES:
- Output ONLY the JSON object, no explanation
- If unsure, set confidence below 0.6
- reason must not contain any personal information
- Do not include email addresses, names, or order IDs in reason"""


class LLMExtractor:
    """
    LLM-based extraction with input minimization and masking.
    Uses caching to reduce API costs.
    """

    # PII masking patterns
    MASK_PATTERNS = [
        (r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "[EMAIL]"),
        (r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "[PHONE]"),
        (r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", "[CARD]"),
        (r"order\s*#?\s*\d+", "order #[ID]", re.IGNORECASE),
        (r"confirmation\s*#?\s*\d+", "confirmation #[ID]", re.IGNORECASE),
    ]

    def __init__(self, cache: Optional["LLMCache"] = None):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.cache = cache

    def mask_content(self, content: str) -> str:
        """Mask PII from content before sending to LLM."""
        masked = content
        for pattern in self.MASK_PATTERNS:
            if len(pattern) == 2:
                regex, replacement = pattern
                flags = 0
            else:
                regex, replacement, flags = pattern
            masked = re.sub(regex, replacement, masked, flags=flags)
        return masked

    async def extract(
        self, email: EmailMetadata, content: str
    ) -> Optional[ExtractionResult]:
        """
        Extract subscription info using LLM.
        Content is masked and minimized before sending.
        """
        # Mask PII
        masked = self.mask_content(content)

        # Check cache first
        if self.cache:
            cache_key = self._cache_key(masked)
            cached = await self.cache.get(cache_key)
            if cached:
                return self._parse_result(cached, email)

        # Call LLM
        try:
            response = await self.client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a subscription extraction assistant. Extract subscription info and return strict JSON only.",
                    },
                    {
                        "role": "user",
                        "content": LLM_EXTRACTION_PROMPT.format(masked_content=masked),
                    },
                ],
                temperature=0.1,
                max_tokens=500,
                response_format={"type": "json_object"},
            )

            result_text = response.choices[0].message.content
            if not result_text:
                return None

            # Parse and validate
            result_data = json.loads(result_text)

            # Cache result
            if self.cache:
                await self.cache.set(cache_key, result_data)

            return self._parse_result(result_data, email)

        except Exception:
            return None

    def _cache_key(self, content: str) -> str:
        """Generate cache key from normalized content."""
        normalized = " ".join(content.lower().split())
        return hashlib.sha256(normalized.encode()).hexdigest()[:32]

    def _parse_result(
        self, data: dict, email: EmailMetadata
    ) -> Optional[ExtractionResult]:
        """Parse LLM result into ExtractionResult."""
        try:
            # Validate with Pydantic
            validated = LLMExtractionSchema(**data)

            # Parse date
            next_billing = None
            if validated.next_billing_date:
                try:
                    next_billing = date.fromisoformat(validated.next_billing_date)
                except ValueError:
                    pass

            return ExtractionResult(
                merchant_name=validated.merchant_name,
                event_type=EventType(validated.event_type),
                amount=validated.amount,
                currency=validated.currency,
                cadence=Cadence(validated.cadence),
                next_billing_date=next_billing,
                confidence=validated.confidence,
                reason=validated.reason,
                extraction_method=ExtractionMethod.LLM,
                provider_message_id=email.message_id,
                email_date=email.date,
            )

        except Exception:
            return None


class LLMCache:
    """
    Redis-based cache for LLM results.
    Caches by content hash to avoid duplicate API calls.
    """

    def __init__(self, redis_client):
        self.redis = redis_client
        self.ttl = 60 * 60 * 24 * 7  # 7 days

    async def get(self, key: str) -> Optional[dict]:
        """Get cached result."""
        data = await self.redis.get(f"llm:{key}")
        if data:
            return json.loads(data)
        return None

    async def set(self, key: str, value: dict) -> None:
        """Cache result."""
        await self.redis.setex(f"llm:{key}", self.ttl, json.dumps(value))
