-- SubscribeTracker Database Initialization Script
-- This runs on first container startup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_user_id VARCHAR(255) NOT NULL UNIQUE,
    email_domain_hash VARCHAR(64),
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider_user_id);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant_name VARCHAR(255) NOT NULL,
    merchant_domain VARCHAR(255),
    amount DECIMAL(12, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    cadence VARCHAR(20) NOT NULL CHECK (cadence IN ('Weekly', 'Monthly', 'Quarterly', 'Yearly', 'Unknown')),
    next_billing_date DATE,
    last_billing_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'PendingReview' 
        CHECK (status IN ('Active', 'Cancelled', 'Paused', 'PendingReview')),
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    extraction_method VARCHAR(20) NOT NULL CHECK (extraction_method IN ('Rule', 'Llm', 'Manual')),
    reason_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing ON subscriptions(next_billing_date);

-- Subscription events table
CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    provider_message_id VARCHAR(255) NOT NULL,
    email_date TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(30) NOT NULL 
        CHECK (event_type IN ('Charge', 'Renewal', 'Cancellation', 'TrialStart', 'TrialEnd', 'PriceChange')),
    amount DECIMAL(12, 2),
    currency VARCHAR(3),
    reason_code VARCHAR(100) NOT NULL,
    confidence_score REAL NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
    extraction_method VARCHAR(20) NOT NULL CHECK (extraction_method IN ('Rule', 'Llm')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (subscription_id, provider_message_id)
);

CREATE INDEX IF NOT EXISTS idx_events_subscription_id ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_events_message_id ON subscription_events(provider_message_id);

-- Sync jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('Backfill', 'Incremental', 'Catchup')),
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Running', 'Completed', 'Failed')),
    emails_scanned INT DEFAULT 0,
    events_extracted INT DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_status ON sync_jobs(user_id, status);

-- Token storage (encrypted)
CREATE TABLE IF NOT EXISTS user_tokens (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    access_token_encrypted BYTEA NOT NULL,
    refresh_token_encrypted BYTEA NOT NULL,
    token_expiry TIMESTAMPTZ NOT NULL,
    encryption_key_version INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
