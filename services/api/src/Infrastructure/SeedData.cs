using Microsoft.EntityFrameworkCore;
using SubscribeTracker.Api.Domain.Entities;
using SubscribeTracker.Api.Domain.Enums;

namespace SubscribeTracker.Api.Infrastructure;

/// <summary>
/// Seeds development data for testing
/// </summary>
public static class SeedData
{
    /// <summary>
    /// Fixed dev user ID for testing without auth
    /// </summary>
    public static readonly Guid DevUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    
    /// <summary>
    /// Seeds the database with a dev user and sample subscriptions
    /// </summary>
    public static async Task SeedAsync(AppDbContext db)
    {
        // Check if dev user exists
        var userExists = await db.Users.AnyAsync(u => u.Id == DevUserId);
        
        if (!userExists)
        {
            // Create dev user
            var devUser = new User
            {
                Id = DevUserId,
                ProviderUserId = "dev-user-local",
                ConnectedAt = DateTime.UtcNow,
                IsActive = true
            };
            
            db.Users.Add(devUser);
            await db.SaveChangesAsync();
            
            // Add sample subscriptions
            var subscriptions = new List<Subscription>
            {
                new Subscription
                {
                    UserId = DevUserId,
                    MerchantName = "Netflix",
                    MerchantDomain = "netflix.com",
                    Amount = 15.99m,
                    Currency = "USD",
                    Cadence = Cadence.Monthly,
                    NextBillingDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
                    Status = SubscriptionStatus.Active,
                    ConfidenceScore = 1.0f,
                    ExtractionMethod = ExtractionMethod.Manual,
                    ReasonSummary = "Sample subscription for testing"
                },
                new Subscription
                {
                    UserId = DevUserId,
                    MerchantName = "Spotify",
                    MerchantDomain = "spotify.com",
                    Amount = 10.99m,
                    Currency = "USD",
                    Cadence = Cadence.Monthly,
                    NextBillingDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(12)),
                    Status = SubscriptionStatus.Active,
                    ConfidenceScore = 1.0f,
                    ExtractionMethod = ExtractionMethod.Manual,
                    ReasonSummary = "Sample subscription for testing"
                },
                new Subscription
                {
                    UserId = DevUserId,
                    MerchantName = "Adobe Creative Cloud",
                    MerchantDomain = "adobe.com",
                    Amount = 54.99m,
                    Currency = "USD",
                    Cadence = Cadence.Monthly,
                    NextBillingDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)),
                    Status = SubscriptionStatus.Active,
                    ConfidenceScore = 1.0f,
                    ExtractionMethod = ExtractionMethod.Manual,
                    ReasonSummary = "Sample subscription for testing"
                },
                new Subscription
                {
                    UserId = DevUserId,
                    MerchantName = "GitHub Pro",
                    MerchantDomain = "github.com",
                    Amount = 4.00m,
                    Currency = "USD",
                    Cadence = Cadence.Monthly,
                    NextBillingDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(20)),
                    Status = SubscriptionStatus.Active,
                    ConfidenceScore = 1.0f,
                    ExtractionMethod = ExtractionMethod.Manual,
                    ReasonSummary = "Sample subscription for testing"
                }
            };
            
            db.Subscriptions.AddRange(subscriptions);
            await db.SaveChangesAsync();
        }
    }
}
