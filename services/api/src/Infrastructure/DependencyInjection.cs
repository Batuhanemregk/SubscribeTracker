using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SubscribeTracker.Api.Infrastructure.Security;

namespace SubscribeTracker.Api.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Token Encryption
        var encryptionKey = configuration["Security:TokenEncryptionKey"];
        if (!string.IsNullOrEmpty(encryptionKey))
        {
            services.AddSingleton<ITokenEncryptionService>(
                new TokenEncryptionService(encryptionKey));
        }

        return services;
    }
}
