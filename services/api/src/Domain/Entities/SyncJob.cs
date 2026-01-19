using SubscribeTracker.Api.Domain.Enums;

namespace SubscribeTracker.Api.Domain.Entities;

/// <summary>
/// Tracks email sync job progress and status.
/// Error messages must be sanitized - no PII.
/// </summary>
public class SyncJob
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    
    public SyncJobType JobType { get; set; }
    public DateTime WindowStart { get; set; }
    public DateTime WindowEnd { get; set; }
    
    public SyncJobStatus Status { get; set; } = SyncJobStatus.Pending;
    
    public int EmailsScanned { get; set; }
    public int EventsExtracted { get; set; }
    
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    
    /// <summary>Sanitized error message (no PII).</summary>
    public string? ErrorMessage { get; set; }
    
    // Navigation
    public User? User { get; set; }
}
