namespace SubscribeTracker.Api.Domain.Entities;

/// <summary>
/// Represents a user connected via OAuth.
/// Contains only hashed identifiers, never raw email/name.
/// </summary>
public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>Hashed Google user ID for lookup.</summary>
    public required string ProviderUserId { get; set; }
    
    /// <summary>SHA256 hash of email domain only (for dedup).</summary>
    public string? EmailDomainHash { get; set; }
    
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastSyncAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? DeletedAt { get; set; }
    
    // Navigation
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    public ICollection<SyncJob> SyncJobs { get; set; } = new List<SyncJob>();
    public UserToken? Token { get; set; }
}
