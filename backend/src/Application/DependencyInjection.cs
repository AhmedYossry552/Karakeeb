using Microsoft.Extensions.DependencyInjection;
using Recycling.Application.Abstractions;
using Recycling.Application.Services;

namespace Recycling.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICatalogService, CatalogService>();
        services.AddScoped<ICartService, CartService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IAddressService, AddressService>();
        services.AddScoped<IPointsService, PointsService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IStockService, StockService>();
        services.AddScoped<IOrderAnalyticsService, OrderAnalyticsService>();
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IWalletService, WalletService>();
        services.AddScoped<IOtpService, OtpService>();
        services.AddScoped<IDeliveryService, DeliveryService>();
        services.AddScoped<ISubscriberService, SubscriberService>();
        services.AddScoped<IContactService, ContactService>();
        services.AddScoped<ISessionService, SessionService>();
        services.AddSingleton<TranscriptionService>();
        services.AddScoped<VoiceCartService>();
        return services;
    }
}
