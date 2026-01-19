"""
Email provider interface - provider agnostic design.
Gmail is one adapter; others can be added without changing extractors.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, AsyncIterator, Optional


@dataclass
class EmailMetadata:
    """Minimal email metadata - no subject/body stored."""

    message_id: str
    date: datetime
    from_domain: Optional[str]  # Only domain, not full address
    snippet: str  # Short preview for extraction


class EmailProvider(ABC):
    """Abstract email provider interface."""

    @abstractmethod
    async def search_emails(
        self,
        credentials: Any,
        start_date: datetime,
        end_date: datetime,
    ) -> AsyncIterator[EmailMetadata]:
        """Search for subscription-related emails in date range."""
        ...

    @abstractmethod
    async def get_email_content(
        self,
        credentials: Any,
        message_id: str,
        max_lines: int = 40,
    ) -> Optional[str]:
        """Get minimized email content for extraction."""
        ...
