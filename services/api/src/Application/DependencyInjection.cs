using Microsoft.Extensions.DependencyInjection;

namespace SubscribeTracker.Api.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // Register application services here
        // services.AddScoped<IAuthService, AuthService>();
        // services.AddScoped<ISubscriptionService, SubscriptionService>();
        // services.AddScoped<ISyncService, SyncService>();
        
        return services;
    }
}
