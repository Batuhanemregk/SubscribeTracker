namespace SubscribeTracker.Api.Application.Interfaces;

/// <summary>
/// Email provider abstraction for Gmail adapter.
/// Provider-agnostic design per project constitution.
/// </summary>
public interface IEmailProvider
{
    /// <summary>Search for subscription-related emails in a date range.</summary>
    Task<IEnumerable<EmailMetadata>> SearchEmailsAsync(
        string userId,
        DateTime startDate,
        DateTime endDate,
        CancellationToken ct = default);

    /// <summary>Get email snippet for extraction (no full body stored).</summary>
    Task<string?> GetEmailSnippetAsync(
        string userId,
        string messageId,
        CancellationToken ct = default);
}

/// <summary>
/// Minimal email metadata - no subject/body stored.
/// </summary>
public record EmailMetadata(
    string MessageId,
    DateTime Date,
    string? FromDomain,
    string Snippet
);
