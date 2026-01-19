using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SubscribeTracker.Api.Domain.Enums;
using SubscribeTracker.Api.Infrastructure;

namespace SubscribeTracker.Api.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class ReviewController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<ReviewController> _logger;

    public ReviewController(AppDbContext db, ILogger<ReviewController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Get items pending review.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetQueue()
    {
        // TODO: Get user ID from JWT claims
        var userId = Guid.Empty;

        var items = await _db.Subscriptions
            .Where(s => s.UserId == userId && s.Status == SubscriptionStatus.PendingReview)
            .OrderByDescending(s => s.ConfidenceScore)
            .Select(s => new ReviewItemDto
            {
                Id = s.Id,
                MerchantName = s.MerchantName,
                MerchantDomain = s.MerchantDomain,
                Amount = s.Amount,
                Currency = s.Currency,
                Cadence = s.Cadence.ToString().ToLower(),
                NextBillingDate = s.NextBillingDate,
                ConfidenceScore = s.ConfidenceScore,
                ExtractionMethod = s.ExtractionMethod.ToString().ToLower(),
                ReasonSummary = s.ReasonSummary ?? "Extracted from email"
            })
            .ToListAsync();

        return Ok(items);
    }

    /// <summary>
    /// Approve item - moves to active subscriptions.
    /// </summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var subscription = await _db.Subscriptions.FindAsync(id);
        if (subscription == null)
            return NotFound();

        subscription.Status = SubscriptionStatus.Active;
        subscription.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("Subscription approved: {Id} {MerchantName}", id, subscription.MerchantName);
        return Ok(subscription);
    }

    /// <summary>
    /// Reject item - will not be added.
    /// </summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id)
    {
        var subscription = await _db.Subscriptions.FindAsync(id);
        if (subscription == null)
            return NotFound();

        // Remove rejected item
        _db.Subscriptions.Remove(subscription);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Subscription rejected: {Id} {MerchantName}", id, subscription.MerchantName);
        return NoContent();
    }

    /// <summary>
    /// Edit and approve item.
    /// </summary>
    [HttpPut("{id:guid}/edit")]
    public async Task<IActionResult> EditAndApprove(Guid id, [FromBody] EditReviewRequest request)
    {
        var subscription = await _db.Subscriptions.FindAsync(id);
        if (subscription == null)
            return NotFound();

        // Apply edits
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

        // Approve
        subscription.Status = SubscriptionStatus.Active;
        subscription.UpdatedAt = DateTime.UtcNow;
        
        await _db.SaveChangesAsync();

        _logger.LogInformation("Subscription edited and approved: {Id} {MerchantName}", id, subscription.MerchantName);
        return Ok(subscription);
    }
}

public record ReviewItemDto
{
    public Guid Id { get; init; }
    public string MerchantName { get; init; } = "";
    public string? MerchantDomain { get; init; }
    public decimal? Amount { get; init; }
    public string Currency { get; init; } = "USD";
    public string Cadence { get; init; } = "unknown";
    public DateOnly? NextBillingDate { get; init; }
    public float ConfidenceScore { get; init; }
    public string ExtractionMethod { get; init; } = "";
    public string ReasonSummary { get; init; } = "";
}

public record EditReviewRequest(
    string? MerchantName,
    decimal? Amount,
    string? Currency,
    string? Cadence,
    DateOnly? NextBillingDate
);
