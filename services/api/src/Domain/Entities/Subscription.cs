using SubscribeTracker.Api.Domain.Enums;

namespace SubscribeTracker.Api.Domain.Entities;

/// <summary>
/// Represents a subscription extracted from email or manually added.
/// Contains only derived data - never raw email content.
/// </summary>
public class Subscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    
    public required string MerchantName { get; set; }
    public string? MerchantDomain { get; set; }
    
    public decimal? Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public Cadence Cadence { get; set; } = Cadence.Unknown;
    
    public DateOnly? NextBillingDate { get; set; }
    public DateOnly? LastBillingDate { get; set; }
    
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.PendingReview;
    public float ConfidenceScore { get; set; }
    public ExtractionMethod ExtractionMethod { get; set; }
    
    /// <summary>Explainable AI: why we inferred this (no PII)</summary>
    public string? ReasonSummary { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public User? User { get; set; }
    public ICollection<SubscriptionEvent> Events { get; set; } = new List<SubscriptionEvent>();
}
