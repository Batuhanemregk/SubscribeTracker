"""
Sync job handlers for email backfill, incremental, and catch-up.
"""
from datetime import datetime, timedelta
from pathlib import Path
from typing import AsyncIterator
from uuid import UUID

import structlog

from src.config import settings
from src.domain.entities import (
    ExtractionResult,
    Subscription,
    SubscriptionEvent,
    SubscriptionStatus,
)
from src.extractors.pipeline import ExtractionPipeline
from src.providers.base import EmailMetadata, EmailProvider

logger = structlog.get_logger()


class SyncJobHandler:
    """
    Handles email sync jobs with idempotent processing.
    Supports backfill (6 months), incremental (72h), and catch-up (7 days).
    """

    def __init__(
        self,
        email_provider: EmailProvider,
        pipeline: ExtractionPipeline,
        db_session,  # Async DB session
    ):
        self.provider = email_provider
        self.pipeline = pipeline
        self.db = db_session

    async def run_backfill(self, user_id: UUID, credentials) -> dict:
        """Run initial 6-month backfill."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30 * settings.backfill_months)

        return await self._process_emails(
            user_id, credentials, start_date, end_date, job_type="backfill"
        )

    async def run_incremental(self, user_id: UUID, credentials) -> dict:
        """Run daily incremental sync (72h window with overlap)."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(hours=settings.incremental_hours)

        return await self._process_emails(
            user_id, credentials, start_date, end_date, job_type="incremental"
        )

    async def run_catchup(self, user_id: UUID, credentials) -> dict:
        """Run weekly catch-up sync (7 days)."""
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=settings.catchup_days)

        return await self._process_emails(
            user_id, credentials, start_date, end_date, job_type="catchup"
        )

    async def _process_emails(
        self,
        user_id: UUID,
        credentials,
        start_date: datetime,
        end_date: datetime,
        job_type: str,
    ) -> dict:
        """Process emails in the given date range."""
        stats = {"emails_scanned": 0, "events_extracted": 0, "errors": 0}

        logger.info(
            "sync_job_started",
            user_id=str(user_id),
            job_type=job_type,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
        )

        try:
            async for email in self.provider.search_emails(
                credentials, start_date, end_date
            ):
                stats["emails_scanned"] += 1

                # Check idempotency - skip if already processed
                if await self._is_processed(user_id, email.message_id):
                    continue

                # Get email content for extraction
                content = await self.provider.get_email_content(
                    credentials, email.message_id, max_lines=40
                )
                if not content:
                    continue

                # Run extraction pipeline
                result = await self.pipeline.extract(email, content)
                if result:
                    await self._save_extraction(user_id, result)
                    stats["events_extracted"] += 1

        except Exception as e:
            logger.error(
                "sync_job_error",
                user_id=str(user_id),
                error=str(e),  # Sanitized - no PII
            )
            stats["errors"] += 1

        logger.info(
            "sync_job_completed",
            user_id=str(user_id),
            job_type=job_type,
            stats=stats,
        )

        return stats

    async def _is_processed(self, user_id: UUID, message_id: str) -> bool:
        """Check if message already processed (idempotency)."""
        # TODO: Query subscription_events table for provider_message_id
        # This prevents duplicate processing of the same email
        return False

    async def _save_extraction(self, user_id: UUID, result: ExtractionResult) -> None:
        """Save extraction result to database."""
        # Find or create subscription
        subscription = await self._find_or_create_subscription(user_id, result)

        # Create event
        event = SubscriptionEvent(
            subscription_id=subscription.id,
            provider_message_id=result.provider_message_id or "",
            email_date=result.email_date or datetime.utcnow(),
            event_type=result.event_type,
            amount=result.amount,
            currency=result.currency,
            reason_code=result.reason,
            confidence_score=result.confidence,
            extraction_method=result.extraction_method,
        )

        # TODO: Save to database
        logger.info(
            "extraction_saved",
            merchant=result.merchant_name,
            event_type=result.event_type.value,
            confidence=result.confidence,
        )

    async def _find_or_create_subscription(
        self, user_id: UUID, result: ExtractionResult
    ) -> Subscription:
        """
        Find existing subscription or create new one.
        Merge strategy: update if higher confidence.
        """
        # TODO: Query by merchant_domain or merchant_name
        # For now, create new subscription
        status = self.pipeline.get_suggested_status(result)

        return Subscription(
            user_id=user_id,
            merchant_name=result.merchant_name,
            merchant_domain=result.merchant_domain,
            amount=result.amount,
            currency=result.currency or "USD",
            cadence=result.cadence,
            next_billing_date=result.next_billing_date,
            status=status,
            confidence_score=result.confidence,
            extraction_method=result.extraction_method,
            reason_summary=result.reason,
        )
