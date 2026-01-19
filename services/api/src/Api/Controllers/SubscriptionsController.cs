using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SubscribeTracker.Api.Domain.Enums;
using SubscribeTracker.Api.Infrastructure;

namespace SubscribeTracker.Api.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class SubscriptionsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<SubscriptionsController> _logger;

    public SubscriptionsController(AppDbContext db, ILogger<SubscriptionsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// List all subscriptions for the current user.
    /// </summary>
    [HttpGet]
    [AllowAnonymous] // TODO: Remove after auth is working
    public async Task<IActionResult> List(
        [FromQuery] SubscriptionStatus? status = null,
        [FromQuery] string? search = null)
    {
        // TODO: Get user ID from JWT claims - using dev user for now
        var userId = SeedData.DevUserId;

        var query = _db.Subscriptions.Where(s => s.UserId == userId);

        if (status.HasValue)
            query = query.Where(s => s.Status == status.Value);

        if (!string.IsNullOrEmpty(search))
            query = query.Where(s => s.MerchantName.Contains(search));

        var subscriptions = await query
            .OrderBy(s => s.NextBillingDate)
            .Select(s => new SubscriptionDto
            {
                Id = s.Id,
                MerchantName = s.MerchantName,
                MerchantDomain = s.MerchantDomain,
                Amount = s.Amount,
                Currency = s.Currency,
                Cadence = s.Cadence.ToString().ToLower(),
                NextBillingDate = s.NextBillingDate,
                LastBillingDate = s.LastBillingDate,
                Status = s.Status.ToString().ToLower(),
                ConfidenceScore = s.ConfidenceScore,
                ExtractionMethod = s.ExtractionMethod.ToString().ToLower(),
                ReasonSummary = s.ReasonSummary
            })
            .ToListAsync();

        return Ok(subscriptions);
    }

    /// <summary>
    /// Get subscription details with events.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var subscription = await _db.Subscriptions
            .Include(s => s.Events)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (subscription == null)
            return NotFound();

        return Ok(new SubscriptionDetailDto
        {
            Id = subscription.Id,
            MerchantName = subscription.MerchantName,
            MerchantDomain = subscription.MerchantDomain,
            Amount = subscription.Amount,
            Currency = subscription.Currency,
            Cadence = subscription.Cadence.ToString().ToLower(),
            NextBillingDate = subscription.NextBillingDate,
            Status = subscription.Status.ToString().ToLower(),
            ConfidenceScore = subscription.ConfidenceScore,
            ReasonSummary = subscription.ReasonSummary,
            Events = subscription.Events.Select(e => new EventDto
            {
                Id = e.Id,
                EventType = e.EventType.ToString().ToLower(),
                EmailDate = e.EmailDate,
                Amount = e.Amount,
                Currency = e.Currency,
                ReasonCode = e.ReasonCode
            }).ToList()
        });
    }

    /// <summary>
    /// Manually create a subscription.
    /// </summary>
    [HttpPost]
    [AllowAnonymous] // TODO: Remove after auth is working
    public async Task<IActionResult> Create([FromBody] CreateSubscriptionRequest request)
    {
        // TODO: Get user ID from JWT claims - using dev user for now
        var userId = SeedData.DevUserId;

        var subscription = new Domain.Entities.Subscription
        {
            UserId = userId,
            MerchantName = request.MerchantName,
            MerchantDomain = request.MerchantDomain,
            Amount = request.Amount,
            Currency = request.Currency ?? "USD",
            Cadence = Enum.Parse<Cadence>(request.Cadence, true),
            NextBillingDate = request.NextBillingDate,
            Status = SubscriptionStatus.Active,
            ConfidenceScore = 1.0f, // Manual = 100% confidence
            ExtractionMethod = ExtractionMethod.Manual,
            ReasonSummary = "Manually added by user"
        };

        _db.Subscriptions.Add(subscription);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Subscription created manually: {MerchantName}", request.MerchantName);

        return CreatedAtAction(nameof(Get), new { id = subscription.Id }, subscription);
    }

    /// <summary>
    /// Update a subscription.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSubscriptionRequest request)
    {
        var subscription = await _db.Subscriptions.FindAsync(id);
        if (subscription == null)
            return NotFound();

        if (!string.IsNullOrEmpty(request.MerchantName))
            subscription.MerchantName = request.MerchantName;
        if (request.Amount.HasValue)
            subscription.Amount = request.Amount;
        if (!string.IsNullOrEmpty(request.Currency))
            subscription.Currency = request.Currency;
        if (!string.IsNullOrEmpty(request.Cadence))
            subscription.Cadence = Enum.Parse<Cadence>(request.Cadence, true);
        if (request.NextBillingDate.HasValue)
            subscription.NextBillingDate = request.NextBillingDate;
        if (!string.IsNullOrEmpty(request.Status))
            subscription.Status = Enum.Parse<SubscriptionStatus>(request.Status, true);

        subscription.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(subscription);
    }

    /// <summary>
    /// Delete a subscription.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [AllowAnonymous] // TODO: Remove after auth is working
    public async Task<IActionResult> Delete(Guid id)
    {
        var subscription = await _db.Subscriptions.FindAsync(id);
        if (subscription == null)
            return NotFound();

        _db.Subscriptions.Remove(subscription);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Subscription deleted: {Id}", id);
        return NoContent();
    }
}

// DTOs
public record SubscriptionDto
{
    public Guid Id { get; init; }
    public string MerchantName { get; init; } = "";
    public string? MerchantDomain { get; init; }
    public decimal? Amount { get; init; }
    public string Currency { get; init; } = "USD";
    public string Cadence { get; init; } = "unknown";
    public DateOnly? NextBillingDate { get; init; }
    public DateOnly? LastBillingDate { get; init; }
    public string Status { get; init; } = "pending_review";
    public float ConfidenceScore { get; init; }
    public string ExtractionMethod { get; init; } = "rule";
    public string? ReasonSummary { get; init; }
}

public record SubscriptionDetailDto : SubscriptionDto
{
    public List<EventDto> Events { get; init; } = new();
}

public record EventDto
{
    public Guid Id { get; init; }
    public string EventType { get; init; } = "";
    public DateTime EmailDate { get; init; }
    public decimal? Amount { get; init; }
    public string? Currency { get; init; }
    public string ReasonCode { get; init; } = "";
}

public record CreateSubscriptionRequest(
    string MerchantName,
    string? MerchantDomain,
    decimal? Amount,
    string? Currency,
    string Cadence,
    DateOnly? NextBillingDate
);

public record UpdateSubscriptionRequest(
    string? MerchantName,
    decimal? Amount,
    string? Currency,
    string? Cadence,
    DateOnly? NextBillingDate,
    string? Status
);
