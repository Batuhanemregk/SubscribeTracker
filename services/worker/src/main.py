"""
Worker main entry point.
Starts job processing from Redis queue.
"""
import asyncio

import redis.asyncio as redis
import structlog

from src.config import settings
from src.utils.redaction import RedactingProcessor

# Configure structured logging with PII redaction
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        RedactingProcessor(),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()


async def process_jobs():
    """Main job processing loop."""
    logger.info("worker_starting", redis_url=settings.redis_url)

    redis_client = redis.from_url(settings.redis_url)

    while True:
        try:
            # Wait for job from queue
            job_data = await redis_client.brpop("sync_jobs", timeout=30)

            if job_data:
                _, job_json = job_data
                logger.info("job_received", job=job_json.decode())
                # TODO: Parse job and run sync handler

        except Exception as e:
            logger.error("job_error", error=str(e))
            await asyncio.sleep(5)


def main():
    """Entry point."""
    asyncio.run(process_jobs())


if __name__ == "__main__":
    main()
