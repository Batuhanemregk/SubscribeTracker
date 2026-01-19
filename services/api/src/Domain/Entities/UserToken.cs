namespace SubscribeTracker.Api.Domain.Entities;

/// <summary>
/// Stores encrypted OAuth tokens.
/// Tokens are encrypted at rest using AES-256-GCM.
/// </summary>
public class UserToken
{
    public Guid UserId { get; set; }
    
    /// <summary>AES-256-GCM encrypted access token.</summary>
    public required byte[] AccessTokenEncrypted { get; set; }
    
    /// <summary>AES-256-GCM encrypted refresh token.</summary>
    public required byte[] RefreshTokenEncrypted { get; set; }
    
    public DateTime TokenExpiry { get; set; }
    
    /// <summary>For key rotation support.</summary>
    public int EncryptionKeyVersion { get; set; } = 1;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation
    public User? User { get; set; }
}
