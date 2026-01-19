using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SubscribeTracker.Api.Domain.Entities;
using SubscribeTracker.Api.Domain.Enums;
using SubscribeTracker.Api.Infrastructure;

namespace SubscribeTracker.Api.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class SyncController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<SyncController> _logger;

    public SyncController(AppDbContext db, ILogger<SyncController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Trigger a manual sync job.
    /// </summary>
    [HttpPost("trigger")]
    public async Task<IActionResult> Trigger([FromBody] SyncTriggerRequest? request = null)
    {
        // TODO: Get user ID from JWT claims
        var userId = Guid.Empty;
        
        // TODO: Check rate limit (10 per day per user)

        var jobType = request?.Type == "backfill" 
            ? SyncJobType.Backfill 
            : SyncJobType.Incremental;

        var now = DateTime.UtcNow;
        var windowStart = jobType == SyncJobType.Backfill
            ? now.AddMonths(-6)
            : now.AddHours(-72);

        var syncJob = new SyncJob
        {
            UserId = userId,
            JobType = jobType,
            WindowStart = windowStart,
            WindowEnd = now,
            Status = SyncJobStatus.Pending
        };

        _db.SyncJobs.Add(syncJob);
        await _db.SaveChangesAsync();

        // TODO: Queue job to worker via Redis/message queue

        _logger.LogInformation("Sync job queued: {JobId} {JobType}", syncJob.Id, jobType);

        return Accepted(new SyncJobDto
        {
            Id = syncJob.Id,
            Type = syncJob.JobType.ToString().ToLower(),
            Status = syncJob.Status.ToString().ToLower(),
            CreatedAt = now
        });
    }

    /// <summary>
    /// Get current sync status.
    /// </summary>
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        // TODO: Get user ID from JWT claims
        var userId = Guid.Empty;

        var user = await _db.Users.FindAsync(userId);
        var currentJob = await _db.SyncJobs
            .Where(j => j.UserId == userId)
            .OrderByDescending(j => j.Id)
            .FirstOrDefaultAsync();

        return Ok(new SyncStatusDto
        {
            CurrentJob = currentJob != null ? new SyncJobDto
            {
                Id = currentJob.Id,
                Type = currentJob.JobType.ToString().ToLower(),
                Status = currentJob.Status.ToString().ToLower(),
                CreatedAt = currentJob.StartedAt ?? DateTime.UtcNow
            } : null,
            LastSync = user?.LastSyncAt,
            EmailsScanned = currentJob?.EmailsScanned ?? 0,
            EventsExtracted = currentJob?.EventsExtracted ?? 0
        });
    }
}

public record SyncTriggerRequest(string? Type);

public record SyncJobDto
{
    public Guid Id { get; init; }
    public string Type { get; init; } = "";
    public string Status { get; init; } = "";
    public DateTime CreatedAt { get; init; }
}

public record SyncStatusDto
{
    public SyncJobDto? CurrentJob { get; init; }
    public DateTime? LastSync { get; init; }
    public int EmailsScanned { get; init; }
    public int EventsExtracted { get; init; }
}
