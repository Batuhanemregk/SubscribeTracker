using Microsoft.AspNetCore.Mvc;

namespace SubscribeTracker.Api.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ILogger<AuthController> _logger;

    public AuthController(ILogger<AuthController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Connect Gmail account via OAuth PKCE flow.
    /// Exchanges authorization code for tokens and stores encrypted.
    /// </summary>
    [HttpPost("connect")]
    public async Task<IActionResult> Connect([FromBody] ConnectRequest request)
    {
        // TODO: Implement OAuth token exchange
        // 1. Validate PKCE code_verifier against code_challenge
        // 2. Exchange code for tokens with Google
        // 3. Encrypt tokens with AES-256-GCM
        // 4. Create/update user record
        // 5. Queue backfill sync job
        // 6. Return JWT access token
        
        _logger.LogInformation("Gmail connect initiated");
        
        return Ok(new AuthResponse
        {
            AccessToken = "placeholder",
            ExpiresIn = 3600,
            UserId = Guid.NewGuid()
        });
    }

    /// <summary>
    /// Disconnect Gmail - revokes access and removes tokens.
    /// </summary>
    [HttpPost("disconnect")]
    public async Task<IActionResult> Disconnect()
    {
        // TODO: Implement disconnect
        // 1. Revoke Google OAuth token
        // 2. Delete encrypted tokens from DB
        // 3. Mark user as inactive
        
        _logger.LogInformation("Gmail disconnect initiated");
        return NoContent();
    }

    /// <summary>
    /// Delete account - removes all user data (forget me).
    /// </summary>
    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount()
    {
        // TODO: Implement full account deletion
        // 1. Revoke Google OAuth token
        // 2. Delete all subscriptions, events, sync jobs
        // 3. Delete encrypted tokens
        // 4. Soft-delete user record
        
        _logger.LogInformation("Account deletion initiated");
        return NoContent();
    }
}

public record ConnectRequest(string Code, string CodeVerifier, string RedirectUri);
public record AuthResponse
{
    public string AccessToken { get; init; } = "";
    public int ExpiresIn { get; init; }
    public Guid UserId { get; init; }
}
