"""
Extraction pipeline orchestrator.
Runs rule extractor first, then LLM for unmatched emails.
Applies confidence gating and merges results.
"""
from pathlib import Path
from typing import Optional

from src.config import settings
from src.domain.entities import ExtractionResult, SubscriptionStatus
from src.extractors.llm_extractor import LLMCache, LLMExtractor
from src.extractors.rule_extractor import RuleExtractor
from src.providers.base import EmailMetadata


class ExtractionPipeline:
    """
    Orchestrates extraction flow:
    1. Rule extractor (fast, high confidence for known merchants)
    2. LLM extractor (for unknown patterns)
    3. Confidence gating
    4. Result normalization
    """

    def __init__(
        self,
        rules_dir: Path,
        llm_cache: Optional[LLMCache] = None,
    ):
        self.rule_extractor = RuleExtractor(rules_dir)
        self.llm_extractor = LLMExtractor(cache=llm_cache)

    async def extract(
        self, email: EmailMetadata, content: str
    ) -> Optional[ExtractionResult]:
        """
        Run extraction pipeline on email.
        Returns None if no subscription detected or confidence too low.
        """
        result = None

        # Step 1: Try rule-based extraction first (fast, high confidence)
        result = self.rule_extractor.extract(email, content)

        if result and result.confidence >= settings.confidence_auto_approve:
            # High confidence rule match - no need for LLM
            return result

        # Step 2: Try LLM extraction for unknown patterns
        if result is None:
            result = await self.llm_extractor.extract(email, content)

        # Step 3: Apply confidence gating
        if result:
            result = self._apply_confidence_gating(result)

        return result

    def _apply_confidence_gating(
        self, result: ExtractionResult
    ) -> Optional[ExtractionResult]:
        """
        Apply confidence thresholds:
        - >= 0.85: Auto-approve (will set status to Active)
        - 0.60 - 0.84: Review queue (PendingReview)
        - < 0.60: Ignore (return None)
        """
        if result.confidence < settings.confidence_review:
            # Too uncertain, ignore
            return None

        # Result passes minimum threshold
        return result

    def get_suggested_status(self, result: ExtractionResult) -> SubscriptionStatus:
        """Determine subscription status based on confidence."""
        if result.confidence >= settings.confidence_auto_approve:
            return SubscriptionStatus.ACTIVE
        else:
            return SubscriptionStatus.PENDING_REVIEW
