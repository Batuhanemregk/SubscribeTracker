using SubscribeTracker.Api.Domain.Enums;

namespace SubscribeTracker.Api.Domain.Entities;

/// <summary>
/// Represents a single event extracted from an email.
/// provider_message_id ensures idempotent processing.
/// </summary>
public class SubscriptionEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubscriptionId { get; set; }
    
    /// <summary>Gmail message ID for idempotency check.</summary>
    public required string ProviderMessageId { get; set; }
    
    public DateTime EmailDate { get; set; }
    public EventType EventType { get; set; }
    
    public decimal? Amount { get; set; }
    public string? Currency { get; set; }
    
    /// <summary>Why we inferred this event (no PII).</summary>
    public required string ReasonCode { get; set; }
    
    public float ConfidenceScore { get; set; }
    public ExtractionMethod ExtractionMethod { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public Subscription? Subscription { get; set; }
}
