using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SubscribeTracker.Api.Domain.Enums;
using SubscribeTracker.Api.Infrastructure;

namespace SubscribeTracker.Api.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Get upcoming payments for next N days.
    /// </summary>
    [HttpGet("upcoming")]
    public async Task<IActionResult> GetUpcoming([FromQuery] int days = 30)
    {
        // TODO: Get user ID from JWT claims
        var userId = Guid.Empty;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var endDate = today.AddDays(days);

        var upcoming = await _db.Subscriptions
            .Where(s => s.UserId == userId 
                && s.Status == SubscriptionStatus.Active
                && s.NextBillingDate.HasValue
                && s.NextBillingDate >= today
                && s.NextBillingDate <= endDate)
            .OrderBy(s => s.NextBillingDate)
            .Select(s => new UpcomingPaymentDto
            {
                SubscriptionId = s.Id,
                MerchantName = s.MerchantName,
                Amount = s.Amount ?? 0,
                Currency = s.Currency,
                DueDate = s.NextBillingDate!.Value,
                DaysUntilDue = s.NextBillingDate!.Value.DayNumber - today.DayNumber
            })
            .ToListAsync();

        return Ok(upcoming);
    }

    /// <summary>
    /// Get budget summary (monthly or yearly).
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] string period = "monthly")
    {
        // TODO: Get user ID from JWT claims
        var userId = Guid.Empty;

        var subscriptions = await _db.Subscriptions
            .Where(s => s.UserId == userId && s.Status == SubscriptionStatus.Active)
            .ToListAsync();

        decimal totalMonthly = 0;
        foreach (var sub in subscriptions)
        {
            if (!sub.Amount.HasValue) continue;
            
            var monthlyAmount = sub.Cadence switch
            {
                Cadence.Weekly => sub.Amount.Value * 4.33m,
                Cadence.Monthly => sub.Amount.Value,
                Cadence.Quarterly => sub.Amount.Value / 3,
                Cadence.Yearly => sub.Amount.Value / 12,
                _ => sub.Amount.Value
            };
            totalMonthly += monthlyAmount;
        }

        var response = new BudgetSummaryDto
        {
            Period = period,
            TotalAmount = period == "yearly" ? totalMonthly * 12 : totalMonthly,
            Currency = "USD", // TODO: Handle multi-currency
            SubscriptionCount = subscriptions.Count
        };

        return Ok(response);
    }
}

public record UpcomingPaymentDto
{
    public Guid SubscriptionId { get; init; }
    public string MerchantName { get; init; } = "";
    public decimal Amount { get; init; }
    public string Currency { get; init; } = "USD";
    public DateOnly DueDate { get; init; }
    public int DaysUntilDue { get; init; }
}

public record BudgetSummaryDto
{
    public string Period { get; init; } = "monthly";
    public decimal TotalAmount { get; init; }
    public string Currency { get; init; } = "USD";
    public int SubscriptionCount { get; init; }
}
