using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

internal static class SqlServerToPostgresCopy
{
    public static async Task<int> RunAsync(string[] args)
    {
        var sourceConnectionString = GetArgValue(args, "--source")
            ?? Environment.GetEnvironmentVariable("SQLSERVER_CONNECTION_STRING")
            ?? "Server=localhost;Database=RecyclingDb;Trusted_Connection=True;TrustServerCertificate=True;";

        var targetConnectionString = GetArgValue(args, "--target")
            ?? BuildPostgresConnectionStringFromDatabaseUrl(Environment.GetEnvironmentVariable("DATABASE_URL"))
            ?? Environment.GetEnvironmentVariable("POSTGRES_CONNECTION_STRING");

        var force = HasArg(args, "--force");
        var batchSize = TryGetInt(GetArgValue(args, "--batchSize"), 500);

        if (string.IsNullOrWhiteSpace(targetConnectionString))
        {
            Console.Error.WriteLine(
                "Missing target Postgres connection. Provide --target or set DATABASE_URL/POSTGRES_CONNECTION_STRING.");
            return 2;
        }

        Console.WriteLine("Starting SQL Server -> PostgreSQL copy...");
        Console.WriteLine($"Batch size: {batchSize}");

        var sourceOptions = new DbContextOptionsBuilder<RecyclingDbContext>()
            .UseSqlServer(sourceConnectionString)
            .Options;

        var targetOptions = new DbContextOptionsBuilder<RecyclingDbContext>()
            .UseNpgsql(targetConnectionString)
            .Options;

        await using var source = new RecyclingDbContext(sourceOptions);
        await using var target = new RecyclingDbContext(targetOptions);

        // Ensure Postgres schema exists.
        await target.Database.MigrateAsync();

        if (!force)
        {
            var hasAnyUsers = await target.Users.AsNoTracking().AnyAsync();
            if (hasAnyUsers)
            {
                Console.Error.WriteLine(
                    "Target database is not empty (users table has rows). Re-run with --force if you're sure.");
                return 3;
            }
        }

        target.ChangeTracker.AutoDetectChangesEnabled = false;

        // Order matters because of FK constraints.
        await CopyUsersAsync(source, target, batchSize);
        await CopyBuyerProfilesAsync(source, target, batchSize);
        await CopyDeliveryProfilesAsync(source, target, batchSize);
        await CopyCategoriesAsync(source, target, batchSize);
        await CopyItemsAsync(source, target, batchSize);
        await CopyAddressesAsync(source, target, batchSize);
        await CopyCartsAsync(source, target, batchSize);
        await CopyCartItemsAsync(source, target, batchSize);
        await CopyOrdersAsync(source, target, batchSize);
        await CopyOrderItemsAsync(source, target, batchSize);
        await CopyOrderStatusHistoryAsync(source, target, batchSize);
        await CopyOrderDeliveryProofsAsync(source, target, batchSize);
        await CopyOrderReviewsAsync(source, target, batchSize);
        await CopyUserWalletsAsync(source, target, batchSize);
        await CopyUserTransactionsAsync(source, target, batchSize);
        await CopyUserPointsHistoryAsync(source, target, batchSize);
        await CopyNotificationsAsync(source, target, batchSize);
        await CopyOtpsAsync(source, target, batchSize);
        await CopySessionsAsync(source, target, batchSize);
        await CopySubscribersAsync(source, target, batchSize);
        await CopyTranslationsAsync(source, target, batchSize);

        await ResetSequencesAsync(target);

        Console.WriteLine("Copy completed successfully.");
        return 0;
    }

    private static async Task CopyUsersAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "users",
            sourceQuery: source.Users.AsNoTracking(),
            addToTarget: batch => target.Users.AddRange(batch),
            map: u => new User
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                Password = u.Password,
                PhoneNumber = u.PhoneNumber,
                Provider = u.Provider,
                Role = u.Role,
                StripeCustomerId = u.StripeCustomerId,
                TotalPoints = u.TotalPoints,
                IsApproved = u.IsApproved,
                ImgUrl = u.ImgUrl,
                Rating = u.Rating,
                TotalReviews = u.TotalReviews,
                RefreshToken = u.RefreshToken,
                LastActiveAt = u.LastActiveAt,
                VoiceUsageCount = u.VoiceUsageCount,
                VoiceUsageLimit = u.VoiceUsageLimit,
                LastVoiceUsageReset = u.LastVoiceUsageReset,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyBuyerProfilesAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "buyer_profile",
            sourceQuery: source.BuyerProfiles.AsNoTracking(),
            addToTarget: batch => target.BuyerProfiles.AddRange(batch),
            map: b => new BuyerProfile
            {
                UserId = b.UserId,
                BusinessName = b.BusinessName,
                BusinessType = b.BusinessType,
                BusinessAddress = b.BusinessAddress,
                BusinessLicense = b.BusinessLicense,
                TaxId = b.TaxId,
                EstimatedMonthlyVolume = b.EstimatedMonthlyVolume,
                User = null!
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyDeliveryProfilesAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "delivery_profile",
            sourceQuery: source.DeliveryProfiles.AsNoTracking(),
            addToTarget: batch => target.DeliveryProfiles.AddRange(batch),
            map: d => new DeliveryProfile
            {
                UserId = d.UserId,
                LicenseNumber = d.LicenseNumber,
                VehicleType = d.VehicleType,
                NationalId = d.NationalId,
                EmergencyContact = d.EmergencyContact,
                DeliveryImage = d.DeliveryImage,
                VehicleImage = d.VehicleImage,
                CriminalRecord = d.CriminalRecord,
                Status = d.Status,
                ApprovedAt = d.ApprovedAt,
                RevokedAt = d.RevokedAt,
                RevokeReason = d.RevokeReason,
                User = null!
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyCategoriesAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "categories",
            sourceQuery: source.Categories.AsNoTracking(),
            addToTarget: batch => target.Categories.AddRange(batch),
            map: c => new Category
            {
                Id = c.Id,
                NameEn = c.NameEn,
                NameAr = c.NameAr,
                DescriptionEn = c.DescriptionEn,
                DescriptionAr = c.DescriptionAr,
                Image = c.Image,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyItemsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "items",
            sourceQuery: source.Items.AsNoTracking(),
            addToTarget: batch => target.Items.AddRange(batch),
            map: i => new Item
            {
                Id = i.Id,
                CategoryId = i.CategoryId,
                NameEn = i.NameEn,
                NameAr = i.NameAr,
                Points = i.Points,
                Price = i.Price,
                MeasurementUnit = i.MeasurementUnit,
                Image = i.Image,
                Quantity = i.Quantity
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyAddressesAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "addresses",
            sourceQuery: source.Addresses.AsNoTracking(),
            addToTarget: batch => target.Addresses.AddRange(batch),
            map: a => new Address
            {
                Id = a.Id,
                UserId = a.UserId,
                City = a.City,
                Area = a.Area,
                Street = a.Street,
                Building = a.Building,
                Floor = a.Floor,
                Apartment = a.Apartment,
                Landmark = a.Landmark,
                Notes = a.Notes,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyCartsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "carts",
            sourceQuery: source.Carts.AsNoTracking(),
            addToTarget: batch => target.Carts.AddRange(batch),
            map: c => new Cart
            {
                Id = c.Id,
                UserId = c.UserId,
                SessionId = c.SessionId,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                Items = new List<CartItem>()
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyCartItemsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "cart_items",
            sourceQuery: source.CartItems.AsNoTracking(),
            addToTarget: batch => target.CartItems.AddRange(batch),
            map: ci => new CartItem
            {
                Id = ci.Id,
                CartId = ci.CartId,
                ItemId = ci.ItemId,
                NameEn = ci.NameEn,
                NameAr = ci.NameAr,
                CategoryNameEn = ci.CategoryNameEn,
                CategoryNameAr = ci.CategoryNameAr,
                Image = ci.Image,
                Points = ci.Points,
                Price = ci.Price,
                MeasurementUnit = ci.MeasurementUnit,
                Quantity = ci.Quantity,
                Cart = null!
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyOrdersAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "orders",
            sourceQuery: source.Orders.AsNoTracking(),
            addToTarget: batch => target.Orders.AddRange(batch),
            map: o => new Order
            {
                Id = o.Id,
                UserId = o.UserId,
                AddressId = o.AddressId,
                CourierId = o.CourierId,
                Status = o.Status,
                PaymentMethod = o.PaymentMethod,
                DeliveryFee = o.DeliveryFee,
                TotalAmount = o.TotalAmount,
                HasQuantityAdjustments = o.HasQuantityAdjustments,
                QuantityAdjustmentNotes = o.QuantityAdjustmentNotes,
                EstimatedWeight = o.EstimatedWeight,
                CollectedAt = o.CollectedAt,
                CompletedAt = o.CompletedAt,
                CreatedAt = o.CreatedAt,
                UpdatedAt = o.UpdatedAt,
                Items = new List<OrderItem>(),
                StatusHistory = new List<OrderStatusHistory>(),
                DeliveryProofs = new List<OrderDeliveryProof>()
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyOrderItemsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "order_items",
            sourceQuery: source.OrderItems.AsNoTracking(),
            addToTarget: batch => target.OrderItems.AddRange(batch),
            map: oi => new OrderItem
            {
                Id = oi.Id,
                OrderId = oi.OrderId,
                ItemId = oi.ItemId,
                CategoryId = oi.CategoryId,
                NameEn = oi.NameEn,
                NameAr = oi.NameAr,
                CategoryNameEn = oi.CategoryNameEn,
                CategoryNameAr = oi.CategoryNameAr,
                Image = oi.Image,
                MeasurementUnit = oi.MeasurementUnit,
                Points = oi.Points,
                Price = oi.Price,
                Quantity = oi.Quantity,
                OriginalQuantity = oi.OriginalQuantity,
                QuantityAdjusted = oi.QuantityAdjusted,
                Unit = oi.Unit,
                Order = null!
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyOrderStatusHistoryAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "order_status_history",
            sourceQuery: source.OrderStatusHistories.AsNoTracking(),
            addToTarget: batch => target.OrderStatusHistories.AddRange(batch),
            map: h => new OrderStatusHistory
            {
                Id = h.Id,
                OrderId = h.OrderId,
                Status = h.Status,
                Timestamp = h.Timestamp,
                UpdatedBy = h.UpdatedBy,
                Notes = h.Notes,
                Order = null!
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyOrderDeliveryProofsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "order_delivery_proof",
            sourceQuery: source.OrderDeliveryProofs.AsNoTracking(),
            addToTarget: batch => target.OrderDeliveryProofs.AddRange(batch),
            map: p => new OrderDeliveryProof
            {
                Id = p.Id,
                OrderId = p.OrderId,
                PhotoPath = p.PhotoPath,
                PhotoUrl = p.PhotoUrl,
                UploadedAt = p.UploadedAt,
                Notes = p.Notes,
                CompletedBy = p.CompletedBy,
                Order = null!
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyOrderReviewsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "order_reviews",
            sourceQuery: source.OrderReviews.AsNoTracking(),
            addToTarget: batch => target.OrderReviews.AddRange(batch),
            map: r => new OrderReview
            {
                Id = r.Id,
                OrderId = r.OrderId,
                UserId = r.UserId,
                CourierId = r.CourierId,
                Stars = r.Stars,
                Comment = r.Comment,
                ReviewedAt = r.ReviewedAt,
                UpdatedAt = r.UpdatedAt,
                Order = null!
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyUserWalletsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "user_wallets",
            sourceQuery: source.UserWallets.AsNoTracking(),
            addToTarget: batch => target.UserWallets.AddRange(batch),
            map: w => new UserWallet
            {
                UserId = w.UserId,
                Balance = w.Balance,
                User = null!
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyUserTransactionsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "user_transactions",
            sourceQuery: source.UserTransactions.AsNoTracking(),
            addToTarget: batch => target.UserTransactions.AddRange(batch),
            map: t => new UserTransaction
            {
                Id = t.Id,
                UserId = t.UserId,
                Type = t.Type,
                Gateway = t.Gateway,
                Amount = t.Amount,
                TransactionDate = t.TransactionDate,
                User = null!
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyUserPointsHistoryAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "user_points_history",
            sourceQuery: source.UserPointsHistories.AsNoTracking(),
            addToTarget: batch => target.UserPointsHistories.AddRange(batch),
            map: p => new UserPointsHistory
            {
                Id = p.Id,
                UserId = p.UserId,
                OrderId = p.OrderId,
                Points = p.Points,
                Type = p.Type,
                Reason = p.Reason,
                Timestamp = p.Timestamp
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyNotificationsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "notifications",
            sourceQuery: source.Notifications.AsNoTracking(),
            addToTarget: batch => target.Notifications.AddRange(batch),
            map: n => new Notification
            {
                Id = n.Id,
                UserId = n.UserId,
                TitleEn = n.TitleEn,
                TitleAr = n.TitleAr,
                BodyEn = n.BodyEn,
                BodyAr = n.BodyAr,
                Type = n.Type,
                OrderId = n.OrderId,
                DataJson = n.DataJson,
                IsRead = n.IsRead,
                CreatedAt = n.CreatedAt
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyOtpsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "otps",
            sourceQuery: source.Otps.AsNoTracking(),
            addToTarget: batch => target.Otps.AddRange(batch),
            map: o => new Otp
            {
                Id = o.Id,
                Email = o.Email,
                Code = o.Code,
                CreatedAt = o.CreatedAt,
                ExpiresAt = o.ExpiresAt,
                UpdatedAt = o.UpdatedAt
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopySessionsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "sessions",
            sourceQuery: source.Sessions.AsNoTracking(),
            addToTarget: batch => target.Sessions.AddRange(batch),
            map: s => new Session
            {
                Id = s.Id,
                UserId = s.UserId,
                SessionId = s.SessionId,
                Device = s.Device,
                IpAddress = s.IpAddress,
                UserAgent = s.UserAgent,
                IsValid = s.IsValid,
                ExpiresAt = s.ExpiresAt,
                CreatedAt = s.CreatedAt,
                LastUsedAt = s.LastUsedAt
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopySubscribersAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "subscribers",
            sourceQuery: source.Subscribers.AsNoTracking(),
            addToTarget: batch => target.Subscribers.AddRange(batch),
            map: s => new Subscriber
            {
                Id = s.Id,
                Email = s.Email,
                SubscribedAt = s.SubscribedAt
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyTranslationsAsync(RecyclingDbContext source, RecyclingDbContext target, int batchSize)
    {
        await CopyAsync(
            name: "translations",
            sourceQuery: source.Translations.AsNoTracking(),
            addToTarget: batch => target.Translations.AddRange(batch),
            map: t => new Translation
            {
                Id = t.Id,
                TranslationKey = t.TranslationKey,
                ReferenceId = t.ReferenceId,
                Type = t.Type,
                TranslationEn = t.TranslationEn,
                TranslationAr = t.TranslationAr,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            },
            saveAndClear: () => SaveAndClearAsync(target),
            batchSize: batchSize);
    }

    private static async Task CopyAsync<TEntity>(
        string name,
        IQueryable<TEntity> sourceQuery,
        Action<List<TEntity>> addToTarget,
        Func<TEntity, TEntity> map,
        Func<Task> saveAndClear,
        int batchSize)
        where TEntity : class
    {
        Console.WriteLine($"Copying {name}...");
        var buffer = new List<TEntity>(batchSize);
        var copied = 0;

        await foreach (var entity in sourceQuery.AsAsyncEnumerable())
        {
            buffer.Add(map(entity));
            if (buffer.Count >= batchSize)
            {
                addToTarget(buffer);
                await saveAndClear();
                copied += buffer.Count;
                buffer.Clear();
                Console.WriteLine($"  {name}: {copied} rows");
            }
        }

        if (buffer.Count > 0)
        {
            addToTarget(buffer);
            await saveAndClear();
            copied += buffer.Count;
            buffer.Clear();
        }

        Console.WriteLine($"Finished {name}: {copied} rows");
    }

    private static async Task SaveAndClearAsync(RecyclingDbContext db)
    {
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
    }

    private static async Task ResetSequencesAsync(RecyclingDbContext target)
    {
        // For int PK tables, align sequences/identities to max(id) after inserting explicit values.
        var sqlStatements = new[]
        {
            "SELECT setval(pg_get_serial_sequence('cart_items','id'), COALESCE((SELECT MAX(id) FROM cart_items), 1), true);",
            "SELECT setval(pg_get_serial_sequence('order_items','id'), COALESCE((SELECT MAX(id) FROM order_items), 1), true);",
            "SELECT setval(pg_get_serial_sequence('order_status_history','id'), COALESCE((SELECT MAX(id) FROM order_status_history), 1), true);",
            "SELECT setval(pg_get_serial_sequence('order_delivery_proof','id'), COALESCE((SELECT MAX(id) FROM order_delivery_proof), 1), true);",
            "SELECT setval(pg_get_serial_sequence('order_reviews','id'), COALESCE((SELECT MAX(id) FROM order_reviews), 1), true);",
            "SELECT setval(pg_get_serial_sequence('user_transactions','id'), COALESCE((SELECT MAX(id) FROM user_transactions), 1), true);",
            "SELECT setval(pg_get_serial_sequence('user_points_history','id'), COALESCE((SELECT MAX(id) FROM user_points_history), 1), true);"
        };

        foreach (var sql in sqlStatements)
        {
            try
            {
                await target.Database.ExecuteSqlRawAsync(sql);
            }
            catch (Exception ex)
            {
                // If a sequence doesn't exist (e.g., identity strategy differs), don't fail the whole import.
                Console.WriteLine($"Warning: sequence reset failed: {ex.Message}");
            }
        }
    }

    private static bool HasArg(string[] args, string name)
    {
        foreach (var a in args)
        {
            if (string.Equals(a, name, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }

    private static string? GetArgValue(string[] args, string name)
    {
        for (var i = 0; i < args.Length; i++)
        {
            if (!string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (i + 1 < args.Length)
            {
                return args[i + 1];
            }
        }

        return null;
    }

    private static int TryGetInt(string? value, int fallback)
    {
        return int.TryParse(value, out var parsed) ? parsed : fallback;
    }

    private static string? BuildPostgresConnectionStringFromDatabaseUrl(string? databaseUrl)
    {
        if (string.IsNullOrWhiteSpace(databaseUrl))
        {
            return null;
        }

        if (!Uri.TryCreate(databaseUrl, UriKind.Absolute, out var uri))
        {
            return databaseUrl;
        }

        var userInfo = uri.UserInfo.Split(':', 2);
        var username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : string.Empty;
        var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
        var database = uri.AbsolutePath.TrimStart('/');
        var port = uri.IsDefaultPort ? 5432 : uri.Port;

        var sslMode = "Require";
        if (!string.IsNullOrWhiteSpace(uri.Query))
        {
            foreach (var part in uri.Query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = part.Split('=', 2);
                if (kv.Length == 2 && string.Equals(Uri.UnescapeDataString(kv[0]), "sslmode", StringComparison.OrdinalIgnoreCase))
                {
                    sslMode = Uri.UnescapeDataString(kv[1]);
                }
            }
        }

        return $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password};Ssl Mode={sslMode};";
    }
}
