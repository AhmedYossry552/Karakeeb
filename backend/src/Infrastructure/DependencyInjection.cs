using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Recycling.Application.Abstractions;
using Recycling.Application.Options;
using Recycling.Infrastructure.Authentication;
using Recycling.Infrastructure.Persistence;
using Recycling.Infrastructure.Repositories;
using Recycling.Infrastructure.Email;

namespace Recycling.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtSettings>(configuration.GetSection("Jwt"));
        services.Configure<EmailSettings>(configuration.GetSection("EmailSettings"));

        static string? BuildPostgresConnectionStringFromDatabaseUrl(string? databaseUrl)
        {
            if (string.IsNullOrWhiteSpace(databaseUrl))
            {
                return null;
            }

            // Railway commonly provides DATABASE_URL as: postgres://user:pass@host:port/dbname
            // Npgsql expects a standard connection string.
            if (!Uri.TryCreate(databaseUrl, UriKind.Absolute, out var uri))
            {
                return databaseUrl;
            }

            var userInfo = uri.UserInfo.Split(':', 2);
            var username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : string.Empty;
            var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
            var database = uri.AbsolutePath.TrimStart('/');

            var port = uri.IsDefaultPort ? 5432 : uri.Port;

            static Dictionary<string, string> ParseQuery(string queryString)
            {
                var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                if (string.IsNullOrWhiteSpace(queryString))
                {
                    return result;
                }

                var trimmed = queryString.TrimStart('?');
                foreach (var part in trimmed.Split('&', StringSplitOptions.RemoveEmptyEntries))
                {
                    var kv = part.Split('=', 2);
                    var key = Uri.UnescapeDataString(kv[0]);
                    var value = kv.Length > 1 ? Uri.UnescapeDataString(kv[1]) : string.Empty;
                    if (!string.IsNullOrWhiteSpace(key))
                    {
                        result[key] = value;
                    }
                }

                return result;
            }

            // Preserve optional query params (sslmode, etc.) if present.
            var query = ParseQuery(uri.Query);
            query.TryGetValue("sslmode", out var sslMode);
            query.TryGetValue("trustservercertificate", out var trustServerCertificate);

            // Default to Require SSL on managed providers.
            var ssl = string.IsNullOrWhiteSpace(sslMode) ? "Require" : sslMode;

            var cs = $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password};Ssl Mode={ssl};";
            if (!string.IsNullOrWhiteSpace(trustServerCertificate))
            {
                cs += $"Trust Server Certificate={trustServerCertificate};";
            }
            return cs;
        }

        var connectionString = configuration.GetConnectionString("DefaultConnection")
                               ?? BuildPostgresConnectionStringFromDatabaseUrl(Environment.GetEnvironmentVariable("DATABASE_URL"));

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "No database connection string configured. Set ConnectionStrings:DefaultConnection or DATABASE_URL.");
        }

        services.AddDbContext<RecyclingDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IBuyerProfileRepository, BuyerProfileRepository>();
        services.AddScoped<IDeliveryProfileRepository, DeliveryProfileRepository>();
        services.AddScoped<IUserWalletRepository, UserWalletRepository>();
        services.AddScoped<IUserTransactionRepository, UserTransactionRepository>();
        services.AddScoped<IOtpRepository, OtpRepository>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<ICategoryRepository, CategoryRepository>();
        services.AddScoped<IItemRepository, ItemRepository>();
        services.AddScoped<ICartRepository, CartRepository>();
        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IAddressRepository, AddressRepository>();
        services.AddScoped<IUserPointsHistoryRepository, UserPointsHistoryRepository>();
        services.AddScoped<IOrderAnalyticsRepository, OrderAnalyticsRepository>();
        services.AddScoped<INotificationRepository, NotificationRepository>();
        services.AddScoped<ISubscriberRepository, SubscriberRepository>();
        services.AddScoped<ISessionRepository, SessionRepository>();

        return services;
    }
}
