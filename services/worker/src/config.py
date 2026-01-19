"""
SubscribeTracker Worker Configuration
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Worker configuration from environment."""

    # Database
    database_url: str = "postgresql+asyncpg://postgres:devpassword@localhost:5432/subscribetracker"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # LLM Budgets
    llm_daily_user_limit: int = 100
    llm_daily_global_limit: int = 10000

    # Sync Settings
    backfill_months: int = 6
    incremental_hours: int = 72
    catchup_days: int = 7

    # Confidence Thresholds
    confidence_auto_approve: float = 0.85
    confidence_review: float = 0.60

    class Config:
        env_file = ".env"


settings = Settings()
