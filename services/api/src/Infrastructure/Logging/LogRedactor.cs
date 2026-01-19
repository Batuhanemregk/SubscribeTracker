using System.Text.RegularExpressions;

namespace SubscribeTracker.Api.Infrastructure.Logging;

/// <summary>
/// PII redaction patterns for logs.
/// Ensures no sensitive data in logs, crash reports, or analytics.
/// </summary>
public static partial class LogRedactor
{
    public static string Redact(string message)
    {
        if (string.IsNullOrEmpty(message))
            return message;

        var result = message;
        
        // Email addresses
        result = EmailPattern().Replace(result, "[EMAIL]");
        
        // Credit card numbers (basic pattern)
        result = CardPattern().Replace(result, "[CARD]");
        
        // Phone numbers (US format)
        result = PhonePattern().Replace(result, "[PHONE]");
        
        // JWT tokens
        result = JwtPattern().Replace(result, "[TOKEN]");
        
        // Refresh tokens in URLs/JSON
        result = RefreshTokenPattern().Replace(result, "refresh_token=[REDACTED]");
        
        // Access tokens in URLs/JSON
        result = AccessTokenPattern().Replace(result, "access_token=[REDACTED]");
        
        // Google OAuth codes
        result = OAuthCodePattern().Replace(result, "code=[REDACTED]");

        return result;
    }

    [GeneratedRegex(@"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", RegexOptions.Compiled)]
    private static partial Regex EmailPattern();

    [GeneratedRegex(@"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", RegexOptions.Compiled)]
    private static partial Regex CardPattern();

    [GeneratedRegex(@"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", RegexOptions.Compiled)]
    private static partial Regex PhonePattern();

    [GeneratedRegex(@"Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+", RegexOptions.Compiled)]
    private static partial Regex JwtPattern();

    [GeneratedRegex(@"refresh_token[""']?\s*[:=]\s*[""']?[A-Za-z0-9\-_]+", RegexOptions.Compiled)]
    private static partial Regex RefreshTokenPattern();

    [GeneratedRegex(@"access_token[""']?\s*[:=]\s*[""']?[A-Za-z0-9\-_]+", RegexOptions.Compiled)]
    private static partial Regex AccessTokenPattern();

    [GeneratedRegex(@"code[""']?\s*[:=]\s*[""']?[A-Za-z0-9\-_/]+", RegexOptions.Compiled)]
    private static partial Regex OAuthCodePattern();
}
