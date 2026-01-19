namespace SubscribeTracker.Api.Domain.Enums;

public enum SubscriptionStatus
{
    Active,
    Cancelled,
    Paused,
    PendingReview
}

public enum Cadence
{
    Weekly,
    Monthly,
    Quarterly,
    Yearly,
    Unknown
}

public enum ExtractionMethod
{
    Rule,
    Llm,
    Manual
}

public enum EventType
{
    Charge,
    Renewal,
    Cancellation,
    TrialStart,
    TrialEnd,
    PriceChange
}

public enum SyncJobType
{
    Backfill,
    Incremental,
    Catchup
}

public enum SyncJobStatus
{
    Pending,
    Running,
    Completed,
    Failed
}
