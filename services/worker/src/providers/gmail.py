"""
Gmail provider adapter.
Implements the email provider interface for Gmail API.
"""
import re
from dataclasses import dataclass
from datetime import datetime
from typing import AsyncIterator, Optional

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from src.providers.base import EmailMetadata, EmailProvider


@dataclass
class GmailProvider(EmailProvider):
    """Gmail API adapter for email access."""

    # Subscription-related search queries
    SUBSCRIPTION_QUERIES = [
        "(subject:subscription OR subject:billing OR subject:receipt)",
        "(subject:renewal OR subject:\"payment confirmation\")",
        "(subject:invoice)",
    ]

    async def search_emails(
        self,
        credentials: Credentials,
        start_date: datetime,
        end_date: datetime,
    ) -> AsyncIterator[EmailMetadata]:
        """
        Search for subscription-related emails in date range.
        Yields only metadata - never stores full content.
        """
        service = build("gmail", "v1", credentials=credentials)

        # Build date query
        after_ts = int(start_date.timestamp())
        before_ts = int(end_date.timestamp())
        date_query = f"after:{after_ts} before:{before_ts}"

        for query in self.SUBSCRIPTION_QUERIES:
            full_query = f"{query} {date_query}"

            try:
                # List messages matching query
                results = (
                    service.users()
                    .messages()
                    .list(userId="me", q=full_query, maxResults=100)
                    .execute()
                )

                messages = results.get("messages", [])

                for msg_ref in messages:
                    msg_id = msg_ref["id"]

                    # Get minimal metadata (not full body)
                    msg = (
                        service.users()
                        .messages()
                        .get(
                            userId="me",
                            id=msg_id,
                            format="metadata",
                            metadataHeaders=["From", "Date"],
                        )
                        .execute()
                    )

                    # Extract from domain only (not full address)
                    from_header = self._get_header(msg, "From")
                    from_domain = self._extract_domain(from_header) if from_header else None

                    # Parse date
                    date_header = self._get_header(msg, "Date")
                    email_date = self._parse_date(date_header) if date_header else datetime.utcnow()

                    # Get snippet (short preview, not full body)
                    snippet = msg.get("snippet", "")

                    yield EmailMetadata(
                        message_id=msg_id,
                        date=email_date,
                        from_domain=from_domain,
                        snippet=snippet[:500],  # Limit snippet length
                    )

            except Exception:
                # Log error but continue with other queries
                continue

    async def get_email_content(
        self,
        credentials: Credentials,
        message_id: str,
        max_lines: int = 40,
    ) -> Optional[str]:
        """
        Get minimized email content for LLM extraction.
        Returns only relevant lines, never stores full body.
        """
        service = build("gmail", "v1", credentials=credentials)

        try:
            msg = (
                service.users()
                .messages()
                .get(userId="me", id=message_id, format="full")
                .execute()
            )

            # Extract text content
            text = self._extract_text_content(msg)
            if not text:
                return None

            # Return only relevant lines for extraction
            relevant_lines = self._extract_relevant_lines(text, max_lines)
            return "\n".join(relevant_lines)

        except Exception:
            return None

    def _get_header(self, msg: dict, name: str) -> Optional[str]:
        """Extract header value from message."""
        headers = msg.get("payload", {}).get("headers", [])
        for header in headers:
            if header.get("name", "").lower() == name.lower():
                return header.get("value")
        return None

    def _extract_domain(self, from_header: str) -> Optional[str]:
        """Extract domain from From header (privacy: no full address stored)."""
        match = re.search(r"@([a-zA-Z0-9.-]+)", from_header)
        return match.group(1).lower() if match else None

    def _parse_date(self, date_str: str) -> datetime:
        """Parse email date header."""
        from email.utils import parsedate_to_datetime

        try:
            return parsedate_to_datetime(date_str)
        except Exception:
            return datetime.utcnow()

    def _extract_text_content(self, msg: dict) -> str:
        """Extract text content from message payload."""
        import base64

        payload = msg.get("payload", {})
        parts = payload.get("parts", [])

        # Try to find text/plain part
        for part in parts:
            if part.get("mimeType") == "text/plain":
                data = part.get("body", {}).get("data", "")
                if data:
                    return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")

        # Fallback to body data
        body_data = payload.get("body", {}).get("data", "")
        if body_data:
            return base64.urlsafe_b64decode(body_data).decode("utf-8", errors="ignore")

        return ""

    def _extract_relevant_lines(self, text: str, max_lines: int) -> list[str]:
        """Extract billing-relevant lines from email text."""
        keywords = [
            "subscription",
            "billing",
            "payment",
            "receipt",
            "invoice",
            "renewal",
            "charge",
            "total",
            "amount",
            "$",
            "€",
            "£",
            "monthly",
            "yearly",
            "annual",
            "next billing",
            "due date",
        ]

        lines = text.split("\n")
        relevant = []

        for line in lines:
            line = line.strip()
            if not line or len(line) < 5:
                continue

            # Check if line contains billing keywords
            line_lower = line.lower()
            if any(kw in line_lower for kw in keywords):
                relevant.append(line)

            if len(relevant) >= max_lines:
                break

        return relevant
