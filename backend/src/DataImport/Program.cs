using System.Globalization;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

internal class Program
{
    private static async Task Main(string[] args)
    {
        // PostgreSQL (timestamptz) + Npgsql requires UTC DateTimes by default.
        // Our source data contains DateTime Kind=Unspecified (from SQL Server), so
        // enable legacy behavior for this import tool to avoid failing the copy.
        AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

        if (args.Length > 0 && string.Equals(args[0], "copy-sqlserver-to-postgres", StringComparison.OrdinalIgnoreCase))
        {
            var remainingArgs = args.Length > 1 ? args[1..] : Array.Empty<string>();
            Environment.ExitCode = await SqlServerToPostgresCopy.RunAsync(remainingArgs);
            return;
        }

        Console.WriteLine("Starting Mongo JSON import into SQL Server...");

        const string connectionString = "Server=localhost;Database=RecyclingDb;Trusted_Connection=True;TrustServerCertificate=True;";

        var optionsBuilder = new DbContextOptionsBuilder<RecyclingDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        using var dbContext = new RecyclingDbContext(optionsBuilder.Options);

        var rootDirectory = Directory.GetCurrentDirectory();
        var mongoFolder = Path.Combine(rootDirectory, "monogo file");
        var usersPath = Path.Combine(mongoFolder, "users.json");
        var categoriesPath = Path.Combine(mongoFolder, "categories.json");
        var addressesPath = Path.Combine(mongoFolder, "addresses.json");
        var ordersPath = Path.Combine(mongoFolder, "orders.json");
        var cartsPath = Path.Combine(mongoFolder, "carts.json");
        var notificationsPath = Path.Combine(mongoFolder, "notifications.json");
        var otpsPath = Path.Combine(mongoFolder, "otps.json");
        var sessionsPath = Path.Combine(mongoFolder, "sessions.json");
        var subscribersPath = Path.Combine(mongoFolder, "subscribers.json");
        var translationsPath = Path.Combine(mongoFolder, "translations.json");

        if (!File.Exists(usersPath))
        {
            Console.WriteLine($"users.json not found at: {usersPath}");
            return;
        }

        Console.WriteLine($"Importing users from: {usersPath}");
        await ImportUsersAsync(dbContext, usersPath);

        if (File.Exists(categoriesPath))
        {
            Console.WriteLine($"Importing categories from: {categoriesPath}");
            await ImportCategoriesAsync(dbContext, categoriesPath);
        }
        else
        {
            Console.WriteLine($"categories.json not found at: {categoriesPath} - skipping categories import.");
        }

        if (File.Exists(addressesPath))
        {
            Console.WriteLine($"Importing addresses from: {addressesPath}");
            await ImportAddressesAsync(dbContext, addressesPath);
        }
        else
        {
            Console.WriteLine($"addresses.json not found at: {addressesPath} - skipping addresses import.");
        }

        if (File.Exists(ordersPath))
        {
            Console.WriteLine($"Importing orders from: {ordersPath}");
            await ImportOrdersAsync(dbContext, ordersPath);

            Console.WriteLine($"Importing user points history from: {usersPath}");
            await ImportUserPointsHistoryAsync(dbContext, usersPath);
        }
        else
        {
            Console.WriteLine($"orders.json not found at: {ordersPath} - skipping orders and user_points_history import.");
        }

        if (File.Exists(sessionsPath))
        {
            Console.WriteLine($"Importing sessions from: {sessionsPath}");
            await ImportSessionsAsync(dbContext, sessionsPath);
        }
        else
        {
            Console.WriteLine($"sessions.json not found at: {sessionsPath} - skipping sessions import.");
        }

        if (File.Exists(cartsPath))
        {
            Console.WriteLine($"Importing carts from: {cartsPath}");
            await ImportCartsAsync(dbContext, cartsPath);
        }
        else
        {
            Console.WriteLine($"carts.json not found at: {cartsPath} - skipping carts import.");
        }

        if (File.Exists(notificationsPath))
        {
            Console.WriteLine($"Importing notifications from: {notificationsPath}");
            await ImportNotificationsAsync(dbContext, notificationsPath);
        }
        else
        {
            Console.WriteLine($"notifications.json not found at: {notificationsPath} - skipping notifications import.");
        }

        if (File.Exists(otpsPath))
        {
            Console.WriteLine($"Importing otps from: {otpsPath}");
            await ImportOtpsAsync(dbContext, otpsPath);
        }
        else
        {
            Console.WriteLine($"otps.json not found at: {otpsPath} - skipping otps import.");
        }

        if (File.Exists(subscribersPath))
        {
            Console.WriteLine($"Importing subscribers from: {subscribersPath}");
            await ImportSubscribersAsync(dbContext, subscribersPath);
        }
        else
        {
            Console.WriteLine($"subscribers.json not found at: {subscribersPath} - skipping subscribers import.");
        }

        if (File.Exists(translationsPath))
        {
            Console.WriteLine($"Importing translations from: {translationsPath}");
            await ImportTranslationsAsync(dbContext, translationsPath);
        }
        else
        {
            Console.WriteLine($"translations.json not found at: {translationsPath} - skipping translations import.");
        }

        Console.WriteLine("Import completed.");
    }

    private static async Task ImportUsersAsync(RecyclingDbContext dbContext, string filePath)
    {
        var lineNumber = 0;
        var importedUsers = 0;

        foreach (var line in File.ReadLines(filePath))
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(line);
                var root = document.RootElement;

                var id = GetMongoObjectId(root, "_id");
                if (id == null)
                {
                    Console.WriteLine($"[users] Skipping line {lineNumber}: missing _id");
                    continue;
                }

                // Avoid duplicates if re-running
                if (await dbContext.Users.AnyAsync(u => u.Id == id))
                {
                    continue;
                }

                var email = GetString(root, "email") ?? string.Empty;

                var user = new User
                {
                    Id = id,
                    Name = GetString(root, "name") ?? string.Empty,
                    Email = email,
                    Password = GetString(root, "password"),
                    PhoneNumber = GetString(root, "phoneNumber"),
                    Provider = GetString(root, "provider"),
                    Role = GetString(root, "role") ?? "customer",
                    StripeCustomerId = GetString(root, "stripeCustomerId"),
                    TotalPoints = GetDecimal(root, "totalPoints") ?? 0m,
                    IsApproved = GetBool(root, "isApproved") ?? false,
                    ImgUrl = GetString(root, "imgUrl"),
                    Rating = GetDecimal(root, "rating"),
                    TotalReviews = GetInt(root, "totalReviews") ?? 0,
                    RefreshToken = GetString(root, "refreshToken"),
                    LastActiveAt = GetMongoDate(root, "lastActiveAt"),
                    LastVoiceUsageReset = GetMongoDate(root, "lastVoiceUsageReset"),
                    VoiceUsageCount = GetInt(root, "voiceUsageCount") ?? 0,
                    VoiceUsageLimit = GetInt(root, "voiceUsageLimit"),
                    CreatedAt = GetMongoDate(root, "createdAt") ?? DateTime.UtcNow,
                    UpdatedAt = GetMongoDate(root, "updatedAt") ?? DateTime.UtcNow
                };

                dbContext.Users.Add(user);

                // Wallet + transactions + profiles from attachments
                if (root.TryGetProperty("attachments", out var attachments) && attachments.ValueKind == JsonValueKind.Object)
                {
                    // Wallet (balance)
                    if (TryGetDecimal(attachments, "balance", out var balance))
                    {
                        dbContext.UserWallets.Add(new UserWallet
                        {
                            UserId = user.Id,
                            Balance = balance
                        });
                    }
                    else
                    {
                        dbContext.UserWallets.Add(new UserWallet
                        {
                            UserId = user.Id,
                            Balance = 0m
                        });
                    }

                    // Transactions
                    if (attachments.TryGetProperty("transactions", out var transactions) &&
                        transactions.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var t in transactions.EnumerateArray())
                        {
                            var type = GetString(t, "type") ?? string.Empty;
                            var amount = GetDecimal(t, "amount") ?? 0m;
                            var date = GetMongoDate(t, "date") ?? DateTime.UtcNow;
                            var gateway = GetString(t, "gateway");

                            dbContext.UserTransactions.Add(new UserTransaction
                            {
                                UserId = user.Id,
                                Type = type,
                                Gateway = gateway,
                                Amount = amount,
                                TransactionDate = date
                            });
                        }
                    }

                    // Buyer profile
                    if (string.Equals(user.Role, "buyer", StringComparison.OrdinalIgnoreCase))
                    {
                        var businessName = GetString(attachments, "businessName") ?? user.Name;
                        var buyerProfile = new BuyerProfile
                        {
                            UserId = user.Id,
                            BusinessName = string.IsNullOrWhiteSpace(businessName) ? user.Name : businessName,
                            BusinessType = GetString(attachments, "businessType"),
                            BusinessAddress = GetString(attachments, "businessAddress"),
                            BusinessLicense = GetString(attachments, "businessLicense"),
                            TaxId = GetString(attachments, "taxId"),
                            EstimatedMonthlyVolume = GetString(attachments, "estimatedMonthlyVolume")
                        };

                        dbContext.BuyerProfiles.Add(buyerProfile);
                    }

                    // Delivery profile
                    if (string.Equals(user.Role, "delivery", StringComparison.OrdinalIgnoreCase))
                    {
                        var deliveryProfile = new DeliveryProfile
                        {
                            UserId = user.Id,
                            LicenseNumber = GetString(attachments, "licenseNumber"),
                            VehicleType = GetString(attachments, "vehicleType"),
                            NationalId = GetString(attachments, "nationalId"),
                            EmergencyContact = GetString(attachments, "emergencyContact"),
                            DeliveryImage = GetString(attachments, "deliveryImage"),
                            VehicleImage = GetString(attachments, "vehicleImage"),
                            CriminalRecord = GetString(attachments, "criminalRecord"),
                            Status = GetString(attachments, "status"),
                            ApprovedAt = GetMongoDate(attachments, "approvedAt"),
                            RevokedAt = GetMongoDate(attachments, "revokedAt"),
                            RevokeReason = GetString(attachments, "revokeReason")
                        };

                        dbContext.DeliveryProfiles.Add(deliveryProfile);
                    }
                }
                else
                {
                    // Ensure wallet exists even if no attachments
                    dbContext.UserWallets.Add(new UserWallet
                    {
                        UserId = user.Id,
                        Balance = 0m
                    });
                }

                importedUsers++;

                if (importedUsers % 50 == 0)
                {
                    await dbContext.SaveChangesAsync();
                    Console.WriteLine($"Imported {importedUsers} users so far...");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing line {lineNumber}: {ex.Message}");
            }
            finally
            {
                document?.Dispose();
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"Finished importing users. Total imported: {importedUsers}");
    }

    private static async Task ImportCategoriesAsync(RecyclingDbContext dbContext, string filePath)
    {
        var lineNumber = 0;
        var importedCategories = 0;

        foreach (var line in File.ReadLines(filePath))
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(line);
                var root = document.RootElement;

                var id = GetMongoObjectId(root, "_id");
                if (id == null)
                {
                    Console.WriteLine($"[categories] Skipping line {lineNumber}: missing _id");
                    continue;
                }

                if (await dbContext.Categories.AnyAsync(c => c.Id == id))
                {
                    continue;
                }

                string? nameEn = null;
                string? nameAr = null;
                if (root.TryGetProperty("name", out var nameElement) &&
                    nameElement.ValueKind == JsonValueKind.Object)
                {
                    if (nameElement.TryGetProperty("en", out var enElement) && enElement.ValueKind == JsonValueKind.String)
                    {
                        nameEn = enElement.GetString();
                    }

                    if (nameElement.TryGetProperty("ar", out var arElement) && arElement.ValueKind == JsonValueKind.String)
                    {
                        nameAr = arElement.GetString();
                    }
                }

                string? descriptionEn = null;
                string? descriptionAr = null;
                if (root.TryGetProperty("description", out var descElement) &&
                    descElement.ValueKind == JsonValueKind.Object)
                {
                    if (descElement.TryGetProperty("en", out var enDesc) && enDesc.ValueKind == JsonValueKind.String)
                    {
                        descriptionEn = enDesc.GetString();
                    }

                    if (descElement.TryGetProperty("ar", out var arDesc) && arDesc.ValueKind == JsonValueKind.String)
                    {
                        descriptionAr = arDesc.GetString();
                    }
                }

                var category = new Category
                {
                    Id = id,
                    NameEn = nameEn ?? string.Empty,
                    NameAr = nameAr ?? string.Empty,
                    DescriptionEn = descriptionEn,
                    DescriptionAr = descriptionAr,
                    Image = GetString(root, "image"),
                    CreatedAt = GetMongoDate(root, "createdAt") ?? DateTime.UtcNow,
                    UpdatedAt = GetMongoDate(root, "updatedAt") ?? DateTime.UtcNow
                };

                dbContext.Categories.Add(category);

                if (root.TryGetProperty("items", out var itemsElement) &&
                    itemsElement.ValueKind == JsonValueKind.Array)
                {
                    foreach (var itemElement in itemsElement.EnumerateArray())
                    {
                        var itemId = GetMongoObjectId(itemElement, "_id");
                        if (itemId == null)
                        {
                            continue;
                        }

                        if (await dbContext.Items.AnyAsync(i => i.Id == itemId))
                        {
                            continue;
                        }

                        string? itemNameEn = null;
                        string? itemNameAr = null;
                        if (itemElement.TryGetProperty("name", out var itemNameElement) &&
                            itemNameElement.ValueKind == JsonValueKind.Object)
                        {
                            if (itemNameElement.TryGetProperty("en", out var enItem) && enItem.ValueKind == JsonValueKind.String)
                            {
                                itemNameEn = enItem.GetString();
                            }

                            if (itemNameElement.TryGetProperty("ar", out var arItem) && arItem.ValueKind == JsonValueKind.String)
                            {
                                itemNameAr = arItem.GetString();
                            }
                        }

                        var item = new Item
                        {
                            Id = itemId,
                            CategoryId = category.Id,
                            NameEn = itemNameEn ?? string.Empty,
                            NameAr = itemNameAr ?? string.Empty,
                            Points = (int)(GetDecimal(itemElement, "points") ?? 0m),
                            Price = GetDecimal(itemElement, "price") ?? 0m,
                            MeasurementUnit = GetInt(itemElement, "measurement_unit") ?? 0,
                            Image = GetString(itemElement, "image"),
                            Quantity = GetDecimal(itemElement, "quantity") ?? 0m
                        };

                        dbContext.Items.Add(item);
                    }
                }

                importedCategories++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing category line {lineNumber}: {ex.Message}");
            }
            finally
            {
                document?.Dispose();
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"Finished importing categories. Total imported: {importedCategories}");
    }

    private static async Task ImportAddressesAsync(RecyclingDbContext dbContext, string filePath)
    {
        var lineNumber = 0;
        var importedAddresses = 0;

        foreach (var line in File.ReadLines(filePath))
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(line);
                var root = document.RootElement;

                var id = GetMongoObjectId(root, "_id");
                var userId = GetMongoObjectId(root, "userId");
                if (id == null || userId == null)
                {
                    Console.WriteLine($"[addresses] Skipping line {lineNumber}: missing id or userId");
                    continue;
                }

                if (!await dbContext.Users.AnyAsync(u => u.Id == userId))
                {
                    // Skip addresses for users that were not imported
                    continue;
                }

                if (await dbContext.Addresses.AnyAsync(a => a.Id == id))
                {
                    continue;
                }

                var address = new Address
                {
                    Id = id,
                    UserId = userId,
                    City = GetString(root, "city") ?? string.Empty,
                    Area = GetString(root, "area") ?? string.Empty,
                    Street = GetString(root, "street") ?? string.Empty,
                    Building = GetString(root, "building"),
                    Floor = GetString(root, "floor"),
                    Apartment = GetString(root, "apartment"),
                    Landmark = GetString(root, "landmark"),
                    Notes = GetString(root, "notes"),
                    CreatedAt = GetMongoDate(root, "createdAt") ?? DateTime.UtcNow,
                    UpdatedAt = GetMongoDate(root, "updatedAt") ?? DateTime.UtcNow
                };

                dbContext.Addresses.Add(address);
                importedAddresses++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing address line {lineNumber}: {ex.Message}");
            }
            finally
            {
                document?.Dispose();
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"Finished importing addresses. Total imported: {importedAddresses}");
    }

    private static async Task ImportOrdersAsync(RecyclingDbContext dbContext, string filePath)
    {
        var lineNumber = 0;
        var importedOrders = 0;

        var existingOrderIds = new HashSet<string>(
            await dbContext.Orders
                .Select(o => o.Id)
                .ToListAsync());

        var knownAddressIds = new HashSet<string>(
            await dbContext.Addresses
                .Select(a => a.Id)
                .ToListAsync());

        var existingUserIds = new HashSet<string>(
            await dbContext.Users
                .Select(u => u.Id)
                .ToListAsync());

        var existingItemIds = new HashSet<string>(
            await dbContext.Items
                .Select(i => i.Id)
                .ToListAsync());

        var existingCategoryIds = new HashSet<string>(
            await dbContext.Categories
                .Select(c => c.Id)
                .ToListAsync());

        foreach (var line in File.ReadLines(filePath))
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(line);
                var root = document.RootElement;

                var id = GetMongoObjectId(root, "_id");
                if (id == null)
                {
                    Console.WriteLine($"[orders] Skipping line {lineNumber}: missing _id");
                    continue;
                }

                if (existingOrderIds.Contains(id))
                {
                    // Skip duplicate order IDs within the same import run
                    continue;
                }

                existingOrderIds.Add(id);

                string? userId = null;
                if (root.TryGetProperty("user", out var userElement) &&
                    userElement.ValueKind == JsonValueKind.Object)
                {
                    userId = GetMongoObjectId(userElement, "userId");
                }

                if (string.IsNullOrWhiteSpace(userId) || !existingUserIds.Contains(userId))
                {
                    Console.WriteLine($"[orders] Skipping line {lineNumber}: missing or unknown userId");
                    continue;
                }

                string? addressId = null;
                if (root.TryGetProperty("address", out var addressElement) &&
                    addressElement.ValueKind == JsonValueKind.Object)
                {
                    addressId = GetMongoObjectId(addressElement, "_id");

                    if (addressId != null && !knownAddressIds.Contains(addressId))
                    {
                        var address = new Address
                        {
                            Id = addressId,
                            UserId = userId,
                            City = GetString(addressElement, "city") ?? string.Empty,
                            Area = GetString(addressElement, "area") ?? string.Empty,
                            Street = GetString(addressElement, "street") ?? string.Empty,
                            Building = GetString(addressElement, "building"),
                            Floor = GetString(addressElement, "floor"),
                            Apartment = GetString(addressElement, "apartment"),
                            Landmark = GetString(addressElement, "landmark"),
                            Notes = GetString(addressElement, "notes"),
                            CreatedAt = GetMongoDate(addressElement, "createdAt") ?? GetMongoDate(root, "createdAt") ?? DateTime.UtcNow,
                            UpdatedAt = GetMongoDate(addressElement, "updatedAt") ?? GetMongoDate(root, "updatedAt") ?? DateTime.UtcNow
                        };

                        dbContext.Addresses.Add(address);
                        knownAddressIds.Add(addressId);
                    }
                }

                // Validate courier against existing users (FK to users)
                string? courierId = null;
                var rawCourierId = GetMongoObjectId(root, "courier");
                if (!string.IsNullOrWhiteSpace(rawCourierId) && existingUserIds.Contains(rawCourierId))
                {
                    courierId = rawCourierId;
                }

                var order = new Order
                {
                    Id = id,
                    UserId = userId,
                    AddressId = addressId,
                    CourierId = courierId,
                    Status = GetString(root, "status") ?? "pending",
                    PaymentMethod = GetString(root, "paymentMethod"),
                    DeliveryFee = GetDecimal(root, "deliveryFee") ?? 0m,
                    TotalAmount = GetDecimal(root, "totalAmount") ?? 0m,
                    HasQuantityAdjustments = GetBool(root, "hasQuantityAdjustments") ?? false,
                    QuantityAdjustmentNotes = GetString(root, "quantityAdjustmentNotes"),
                    EstimatedWeight = GetDecimal(root, "estimatedWeight"),
                    CollectedAt = GetMongoDate(root, "collectedAt"),
                    CompletedAt = GetMongoDate(root, "completedAt"),
                    CreatedAt = GetMongoDate(root, "createdAt") ?? DateTime.UtcNow,
                    UpdatedAt = GetMongoDate(root, "updatedAt") ?? DateTime.UtcNow
                };

                dbContext.Orders.Add(order);

                if (root.TryGetProperty("items", out var itemsElement) &&
                    itemsElement.ValueKind == JsonValueKind.Array)
                {
                    foreach (var itemElement in itemsElement.EnumerateArray())
                    {
                        var itemId = GetMongoObjectId(itemElement, "_id");
                        var categoryId = GetMongoObjectId(itemElement, "categoryId");

                        if (itemId != null && !existingItemIds.Contains(itemId))
                        {
                            itemId = null;
                        }

                        if (categoryId != null && !existingCategoryIds.Contains(categoryId))
                        {
                            categoryId = null;
                        }

                        string? itemNameEn = null;
                        string? itemNameAr = null;
                        if (itemElement.TryGetProperty("name", out var itemNameElement) &&
                            itemNameElement.ValueKind == JsonValueKind.Object)
                        {
                            if (itemNameElement.TryGetProperty("en", out var enItem) && enItem.ValueKind == JsonValueKind.String)
                            {
                                itemNameEn = enItem.GetString();
                            }

                            if (itemNameElement.TryGetProperty("ar", out var arItem) && arItem.ValueKind == JsonValueKind.String)
                            {
                                itemNameAr = arItem.GetString();
                            }
                        }

                        string? categoryNameEn = null;
                        string? categoryNameAr = null;
                        if (itemElement.TryGetProperty("categoryName", out var categoryNameElement) &&
                            categoryNameElement.ValueKind == JsonValueKind.Object)
                        {
                            if (categoryNameElement.TryGetProperty("en", out var enCat) && enCat.ValueKind == JsonValueKind.String)
                            {
                                categoryNameEn = enCat.GetString();
                            }

                            if (categoryNameElement.TryGetProperty("ar", out var arCat) && arCat.ValueKind == JsonValueKind.String)
                            {
                                categoryNameAr = arCat.GetString();
                            }
                        }

                        var orderItem = new OrderItem
                        {
                            OrderId = order.Id,
                            ItemId = itemId,
                            CategoryId = categoryId,
                            NameEn = itemNameEn ?? string.Empty,
                            NameAr = itemNameAr ?? string.Empty,
                            CategoryNameEn = categoryNameEn ?? string.Empty,
                            CategoryNameAr = categoryNameAr ?? string.Empty,
                            Image = GetString(itemElement, "image"),
                            MeasurementUnit = GetInt(itemElement, "measurement_unit") ?? 0,
                            Points = (int)(GetDecimal(itemElement, "points") ?? 0m),
                            Price = GetDecimal(itemElement, "price") ?? 0m,
                            Quantity = GetDecimal(itemElement, "quantity") ?? 0m,
                            OriginalQuantity = GetDecimal(itemElement, "originalQuantity"),
                            QuantityAdjusted = GetBool(itemElement, "quantityAdjusted") ?? false,
                            Unit = GetString(itemElement, "unit")
                        };

                        dbContext.OrderItems.Add(orderItem);
                    }
                }

                if (root.TryGetProperty("statusHistory", out var historyElement) &&
                    historyElement.ValueKind == JsonValueKind.Array)
                {
                    foreach (var history in historyElement.EnumerateArray())
                    {
                        var status = GetString(history, "status");
                        if (string.IsNullOrWhiteSpace(status))
                        {
                            continue;
                        }

                        var timestamp = GetMongoDate(history, "timestamp") ?? order.CreatedAt;
                        var updatedBy = GetString(history, "updatedBy");
                        var notes = GetString(history, "notes");

                        dbContext.OrderStatusHistories.Add(new OrderStatusHistory
                        {
                            OrderId = order.Id,
                            Status = status,
                            Timestamp = timestamp,
                            UpdatedBy = updatedBy,
                            Notes = notes
                        });
                    }
                }

                if (root.TryGetProperty("deliveryProof", out var proofElement) &&
                    proofElement.ValueKind == JsonValueKind.Object)
                {
                    var completedBy = GetMongoObjectId(proofElement, "completedBy");
                    if (!string.IsNullOrWhiteSpace(completedBy) && existingUserIds.Contains(completedBy))
                    {
                        var proof = new OrderDeliveryProof
                        {
                            OrderId = order.Id,
                            PhotoPath = GetString(proofElement, "photoPath") ?? string.Empty,
                            PhotoUrl = GetString(proofElement, "photoUrl") ?? string.Empty,
                            UploadedAt = GetMongoDate(proofElement, "uploadedAt") ?? DateTime.UtcNow,
                            Notes = GetString(proofElement, "notes"),
                            CompletedBy = completedBy
                        };

                        dbContext.OrderDeliveryProofs.Add(proof);
                    }
                }

                importedOrders++;

                if (importedOrders % 50 == 0)
                {
                    await dbContext.SaveChangesAsync();
                    Console.WriteLine($"Imported {importedOrders} orders so far...");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing order line {lineNumber}: {ex.Message}");
            }
            finally
            {
                document?.Dispose();
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"Finished importing orders. Total imported: {importedOrders}");
    }

    private static async Task ImportUserPointsHistoryAsync(RecyclingDbContext dbContext, string filePath)
    {
        if (await dbContext.UserPointsHistories.AnyAsync())
        {
            Console.WriteLine("user_points_history table already has data - skipping import.");
            return;
        }

        var lineNumber = 0;
        var imported = 0;

        foreach (var line in File.ReadLines(filePath))
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(line);
                var root = document.RootElement;

                var userId = GetMongoObjectId(root, "_id");
                if (userId == null)
                {
                    Console.WriteLine($"[user_points_history] Skipping line {lineNumber}: missing user _id");
                    continue;
                }

                if (!await dbContext.Users.AnyAsync(u => u.Id == userId))
                {
                    continue;
                }

                if (!root.TryGetProperty("pointsHistory", out var pointsHistory) ||
                    pointsHistory.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var ph in pointsHistory.EnumerateArray())
                {
                    if (!TryGetDecimal(ph, "points", out var pointsDec))
                    {
                        continue;
                    }

                    if (pointsDec > int.MaxValue || pointsDec < int.MinValue)
                    {
                        continue;
                    }

                    var points = (int)Math.Round(pointsDec);
                    var type = GetString(ph, "type") ?? string.Empty;
                    var reason = GetString(ph, "reason") ?? string.Empty;
                    var timestamp = GetMongoDate(ph, "timestamp") ?? DateTime.UtcNow;

                    string? orderId = null;
                    if (ph.TryGetProperty("orderId", out var orderIdElement))
                    {
                        if (orderIdElement.ValueKind == JsonValueKind.Object &&
                            orderIdElement.TryGetProperty("$oid", out var orderOid))
                        {
                            orderId = orderOid.GetString();
                        }
                        else if (orderIdElement.ValueKind == JsonValueKind.String)
                        {
                            orderId = orderIdElement.GetString();
                        }
                    }

                    if (!string.IsNullOrWhiteSpace(orderId) &&
                        !await dbContext.Orders.AnyAsync(o => o.Id == orderId))
                    {
                        orderId = null;
                    }

                    dbContext.UserPointsHistories.Add(new UserPointsHistory
                    {
                        UserId = userId,
                        OrderId = orderId,
                        Points = points,
                        Type = type,
                        Reason = reason,
                        Timestamp = timestamp
                    });

                    imported++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing user_points_history line {lineNumber}: {ex.Message}");
            }
            finally
            {
                document?.Dispose();
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"Finished importing user points history. Total imported: {imported}");
    }

    private static async Task ImportCartsAsync(RecyclingDbContext dbContext, string filePath)
    {
        var lineNumber = 0;
        var importedCarts = 0;

        foreach (var line in File.ReadLines(filePath))
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(line);
                var root = document.RootElement;

                var id = GetMongoObjectId(root, "_id");
                if (id == null)
                {
                    Console.WriteLine($"[carts] Skipping line {lineNumber}: missing _id");
                    continue;
                }

                if (await dbContext.Carts.AnyAsync(c => c.Id == id))
                {
                    continue;
                }

                var userId = GetMongoObjectId(root, "userId");
                if (!string.IsNullOrWhiteSpace(userId) &&
                    !await dbContext.Users.AnyAsync(u => u.Id == userId))
                {
                    // Avoid FK violations for carts referencing non-existent users
                    userId = null;
                }

                string? sessionGuid = null;
                if (root.TryGetProperty("sessionId", out var sessionElement) &&
                    sessionElement.ValueKind == JsonValueKind.String)
                {
                    sessionGuid = sessionElement.GetString();
                }

                string? sessionId = null;
                if (!string.IsNullOrWhiteSpace(sessionGuid))
                {
                    // carts.session_id has an FK to sessions.id, but the JSON stores the session GUID.
                    // Resolve the GUID to the corresponding Session.Id if it exists.
                    var sessionEntityId = await dbContext.Sessions
                        .Where(s => s.SessionId == sessionGuid)
                        .Select(s => s.Id)
                        .FirstOrDefaultAsync();

                    if (!string.IsNullOrWhiteSpace(sessionEntityId))
                    {
                        sessionId = sessionEntityId;
                    }
                }

                var cart = new Cart
                {
                    Id = id,
                    UserId = userId,
                    SessionId = sessionId,
                    CreatedAt = GetMongoDate(root, "createdAt") ?? DateTime.UtcNow,
                    UpdatedAt = GetMongoDate(root, "updatedAt") ?? DateTime.UtcNow
                };

                dbContext.Carts.Add(cart);

                if (root.TryGetProperty("items", out var itemsElement) &&
                    itemsElement.ValueKind == JsonValueKind.Array)
                {
                    foreach (var itemElement in itemsElement.EnumerateArray())
                    {
                        var itemId = GetMongoObjectId(itemElement, "_id");
                        if (itemId == null)
                        {
                            continue;
                        }

                        string? itemNameEn = null;
                        string? itemNameAr = null;
                        if (itemElement.TryGetProperty("name", out var itemNameElement) &&
                            itemNameElement.ValueKind == JsonValueKind.Object)
                        {
                            if (itemNameElement.TryGetProperty("en", out var enItem) && enItem.ValueKind == JsonValueKind.String)
                            {
                                itemNameEn = enItem.GetString();
                            }

                            if (itemNameElement.TryGetProperty("ar", out var arItem) && arItem.ValueKind == JsonValueKind.String)
                            {
                                itemNameAr = arItem.GetString();
                            }
                        }

                        string? categoryNameEn = null;
                        string? categoryNameAr = null;
                        if (itemElement.TryGetProperty("categoryName", out var categoryNameElement) &&
                            categoryNameElement.ValueKind == JsonValueKind.Object)
                        {
                            if (categoryNameElement.TryGetProperty("en", out var enCat) && enCat.ValueKind == JsonValueKind.String)
                            {
                                categoryNameEn = enCat.GetString();
                            }

                            if (categoryNameElement.TryGetProperty("ar", out var arCat) && arCat.ValueKind == JsonValueKind.String)
                            {
                                categoryNameAr = arCat.GetString();
                            }
                        }

                        var cartItem = new CartItem
                        {
                            CartId = cart.Id,
                            ItemId = itemId,
                            NameEn = itemNameEn ?? string.Empty,
                            NameAr = itemNameAr ?? string.Empty,
                            CategoryNameEn = categoryNameEn ?? string.Empty,
                            CategoryNameAr = categoryNameAr ?? string.Empty,
                            Image = GetString(itemElement, "image"),
                            MeasurementUnit = GetInt(itemElement, "measurement_unit") ?? 0,
                            Points = (int)(GetDecimal(itemElement, "points") ?? 0m),
                            Price = GetDecimal(itemElement, "price") ?? 0m,
                            Quantity = GetDecimal(itemElement, "quantity") ?? 0m
                        };

                        dbContext.CartItems.Add(cartItem);
                    }
                }

                importedCarts++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing cart line {lineNumber}: {ex.Message}");
            }
            finally
            {
                document?.Dispose();
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"Finished importing carts. Total imported: {importedCarts}");
    }

    private static async Task ImportNotificationsAsync(RecyclingDbContext dbContext, string filePath)
    {
        var lineNumber = 0;
        var importedNotifications = 0;

        foreach (var line in File.ReadLines(filePath))
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(line);
                var root = document.RootElement;

                var id = GetMongoObjectId(root, "_id");
                if (id == null)
                {
                    Console.WriteLine($"[notifications] Skipping line {lineNumber}: missing _id");
                    continue;
                }

                if (await dbContext.Notifications.AnyAsync(n => n.Id == id))
                {
                    continue;
                }

                var userId = GetMongoObjectId(root, "userId");
                if (userId == null || !await dbContext.Users.AnyAsync(u => u.Id == userId))
                {
                    Console.WriteLine($"[notifications] Skipping line {lineNumber}: missing or unknown userId");
                    continue;
                }

                string titleEn = string.Empty;
                string titleAr = string.Empty;
                if (root.TryGetProperty("title", out var titleElement))
                {
                    if (titleElement.ValueKind == JsonValueKind.String)
                    {
                        var value = titleElement.GetString() ?? string.Empty;
                        titleEn = value;
                        titleAr = value;
                    }
                    else if (titleElement.ValueKind == JsonValueKind.Object)
                    {
                        titleEn = GetString(titleElement, "en") ?? string.Empty;
                        titleAr = GetString(titleElement, "ar") ?? titleEn;
                    }
                }

                string bodyEn = string.Empty;
                string bodyAr = string.Empty;
                if (root.TryGetProperty("body", out var bodyElement))
                {
                    if (bodyElement.ValueKind == JsonValueKind.String)
                    {
                        var value = bodyElement.GetString() ?? string.Empty;
                        bodyEn = value;
                        bodyAr = value;
                    }
                    else if (bodyElement.ValueKind == JsonValueKind.Object)
                    {
                        bodyEn = GetString(bodyElement, "en") ?? string.Empty;
                        bodyAr = GetString(bodyElement, "ar") ?? bodyEn;
                    }
                }

                var type = GetString(root, "type") ?? string.Empty;

                string? orderId = GetMongoObjectId(root, "orderId");
                if (!string.IsNullOrWhiteSpace(orderId) &&
                    !await dbContext.Orders.AnyAsync(o => o.Id == orderId))
                {
                    orderId = null;
                }

                string? dataJson = null;
                if (root.TryGetProperty("data", out var dataElement) &&
                    dataElement.ValueKind != JsonValueKind.Null &&
                    dataElement.ValueKind != JsonValueKind.Undefined)
                {
                    dataJson = dataElement.GetRawText();
                }

                var isRead = GetBool(root, "isRead") ?? false;
                var createdAt = GetMongoDate(root, "createdAt") ?? DateTime.UtcNow;

                var notification = new Notification
                {
                    Id = id,
                    UserId = userId,
                    TitleEn = titleEn,
                    TitleAr = titleAr,
                    BodyEn = bodyEn,
                    BodyAr = bodyAr,
                    Type = type,
                    OrderId = orderId,
                    DataJson = dataJson,
                    IsRead = isRead,
                    CreatedAt = createdAt
                };

                dbContext.Notifications.Add(notification);
                importedNotifications++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing notification line {lineNumber}: {ex.Message}");
            }
            finally
            {
                document?.Dispose();
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"Finished importing notifications. Total imported: {importedNotifications}");
    }

    private static async Task ImportOtpsAsync(RecyclingDbContext dbContext, string filePath)
    {
        var lineNumber = 0;
        var importedOtps = 0;

        foreach (var line in File.ReadLines(filePath))
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(line);
                var root = document.RootElement;

                var id = GetMongoObjectId(root, "_id");
                if (id == null)
                {
                    Console.WriteLine($"[otps] Skipping line {lineNumber}: missing _id");
                    continue;
                }

                if (await dbContext.Otps.AnyAsync(o => o.Id == id))
                {
                    continue;
                }

                var email = GetString(root, "email") ?? string.Empty;
                var code = GetString(root, "code") ?? string.Empty;
                var createdAt = GetMongoDate(root, "createdAt") ?? DateTime.UtcNow;
                var expiresAt = GetMongoDate(root, "expiresAt") ?? createdAt.AddMinutes(5);
                var updatedAt = GetMongoDate(root, "updatedAt") ?? createdAt;

                var otp = new Otp
                {
                    Id = id,
                    Email = email,
                    Code = code,
                    CreatedAt = createdAt,
                    ExpiresAt = expiresAt,
                    UpdatedAt = updatedAt
                };

                dbContext.Otps.Add(otp);
                importedOtps++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing otp line {lineNumber}: {ex.Message}");
            }
            finally
            {
                document?.Dispose();
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"Finished importing otps. Total imported: {importedOtps}");
    }

    private static async Task ImportSessionsAsync(RecyclingDbContext dbContext, string filePath)
    {
        var lineNumber = 0;
        var importedSessions = 0;

        foreach (var line in File.ReadLines(filePath))
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(line);
                var root = document.RootElement;

                var id = GetMongoObjectId(root, "_id");
                if (id == null)
                {
                    Console.WriteLine($"[sessions] Skipping line {lineNumber}: missing _id");
                    continue;
                }

                if (await dbContext.Sessions.AnyAsync(s => s.Id == id))
                {
                    continue;
                }

                var userId = GetMongoObjectId(root, "userId");
                if (!string.IsNullOrWhiteSpace(userId) &&
                    !await dbContext.Users.AnyAsync(u => u.Id == userId))
                {
                    // Avoid FK violations for unknown users
                    userId = null;
                }

                var sessionId = GetString(root, "sessionId") ?? string.Empty;
                if (string.IsNullOrWhiteSpace(sessionId))
                {
                    Console.WriteLine($"[sessions] Skipping line {lineNumber}: missing sessionId");
                    continue;
                }

                var device = GetString(root, "device");
                var ipAddress = GetString(root, "ipAddress");
                var userAgent = GetString(root, "userAgent");
                var isValid = GetBool(root, "isValid") ?? true;
                var expiresAt = GetMongoDate(root, "expiresAt") ?? DateTime.UtcNow.AddMonths(1);
                var createdAt = GetMongoDate(root, "createdAt") ?? DateTime.UtcNow;
                var lastUsedAt = GetMongoDate(root, "lastUsedAt");

                var session = new Session
                {
                    Id = id,
                    UserId = userId,
                    SessionId = sessionId,
                    Device = device,
                    IpAddress = ipAddress,
                    UserAgent = userAgent,
                    IsValid = isValid,
                    ExpiresAt = expiresAt,
                    CreatedAt = createdAt,
                    LastUsedAt = lastUsedAt
                };

                dbContext.Sessions.Add(session);
                importedSessions++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing session line {lineNumber}: {ex.Message}");
            }
            finally
            {
                document?.Dispose();
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"Finished importing sessions. Total imported: {importedSessions}");
    }

    private static async Task ImportSubscribersAsync(RecyclingDbContext dbContext, string filePath)
    {
        var lineNumber = 0;
        var importedSubscribers = 0;

        foreach (var line in File.ReadLines(filePath))
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(line);
                var root = document.RootElement;

                var id = GetMongoObjectId(root, "_id");
                if (id == null)
                {
                    Console.WriteLine($"[subscribers] Skipping line {lineNumber}: missing _id");
                    continue;
                }

                if (await dbContext.Subscribers.AnyAsync(s => s.Id == id))
                {
                    continue;
                }

                var email = GetString(root, "email") ?? string.Empty;
                if (string.IsNullOrWhiteSpace(email))
                {
                    Console.WriteLine($"[subscribers] Skipping line {lineNumber}: missing email");
                    continue;
                }

                var subscribedAt = GetMongoDate(root, "subscribedAt") ?? DateTime.UtcNow;

                var subscriber = new Subscriber
                {
                    Id = id,
                    Email = email,
                    SubscribedAt = subscribedAt
                };

                dbContext.Subscribers.Add(subscriber);
                importedSubscribers++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing subscriber line {lineNumber}: {ex.Message}");
            }
            finally
            {
                document?.Dispose();
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"Finished importing subscribers. Total imported: {importedSubscribers}");
    }

    private static async Task ImportTranslationsAsync(RecyclingDbContext dbContext, string filePath)
    {
        var lineNumber = 0;
        var importedTranslations = 0;

        foreach (var line in File.ReadLines(filePath))
        {
            lineNumber++;
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            JsonDocument? document = null;
            try
            {
                document = JsonDocument.Parse(line);
                var root = document.RootElement;

                var id = GetMongoObjectId(root, "_id");
                if (id == null)
                {
                    Console.WriteLine($"[translations] Skipping line {lineNumber}: missing _id");
                    continue;
                }

                if (await dbContext.Translations.AnyAsync(t => t.Id == id))
                {
                    continue;
                }

                var key = GetString(root, "key") ?? string.Empty;
                if (string.IsNullOrWhiteSpace(key))
                {
                    Console.WriteLine($"[translations] Skipping line {lineNumber}: missing key");
                    continue;
                }

                var referenceId = GetString(root, "referenceId");
                var type = GetString(root, "type");

                string? translationEn = null;
                string? translationAr = null;
                if (root.TryGetProperty("translations", out var translationsElement) &&
                    translationsElement.ValueKind == JsonValueKind.Object)
                {
                    translationEn = GetString(translationsElement, "en");
                    translationAr = GetString(translationsElement, "ar");
                }

                var createdAt = GetMongoDate(root, "createdAt") ?? DateTime.UtcNow;
                var updatedAt = GetMongoDate(root, "updatedAt") ?? createdAt;

                var translation = new Translation
                {
                    Id = id,
                    TranslationKey = key,
                    ReferenceId = referenceId,
                    Type = type,
                    TranslationEn = translationEn,
                    TranslationAr = translationAr,
                    CreatedAt = createdAt,
                    UpdatedAt = updatedAt
                };

                dbContext.Translations.Add(translation);
                importedTranslations++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing translation line {lineNumber}: {ex.Message}");
            }
            finally
            {
                document?.Dispose();
            }
        }

        await dbContext.SaveChangesAsync();
        Console.WriteLine($"Finished importing translations. Total imported: {importedTranslations}");
    }

    private static string? GetString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var prop) &&
               prop.ValueKind == JsonValueKind.String
            ? prop.GetString()
            : null;
    }

    private static bool? GetBool(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var prop) &&
               prop.ValueKind == JsonValueKind.True || prop.ValueKind == JsonValueKind.False
            ? prop.GetBoolean()
            : null;
    }

    private static int? GetInt(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }

        if (prop.ValueKind == JsonValueKind.Number && prop.TryGetInt32(out var value))
        {
            return value;
        }

        if (prop.ValueKind == JsonValueKind.String && int.TryParse(prop.GetString(), out value))
        {
            return value;
        }

        return null;
    }

    private static decimal? GetDecimal(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }

        const decimal maxSqlDecimal = 9999999999999999.99m; // decimal(18,2)

        if (prop.ValueKind == JsonValueKind.Number && prop.TryGetDecimal(out var value))
        {
            if (value > maxSqlDecimal || value < -maxSqlDecimal)
            {
                return null;
            }

            return value;
        }

        if (prop.ValueKind == JsonValueKind.String &&
            decimal.TryParse(prop.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out value))
        {
            if (value > maxSqlDecimal || value < -maxSqlDecimal)
            {
                return null;
            }

            return value;
        }

        return null;
    }

    private static bool TryGetDecimal(JsonElement element, string propertyName, out decimal value)
    {
        value = 0m;
        var dec = GetDecimal(element, propertyName);
        if (dec.HasValue)
        {
            value = dec.Value;
            return true;
        }

        return false;
    }

    private static DateTime? GetMongoDate(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }

        if (prop.ValueKind == JsonValueKind.Object && prop.TryGetProperty("$date", out var dateValue))
        {
            if (dateValue.ValueKind == JsonValueKind.String &&
                DateTime.TryParse(dateValue.GetString(), null, DateTimeStyles.AdjustToUniversal, out var dt))
            {
                return dt;
            }
        }
        else if (prop.ValueKind == JsonValueKind.String &&
                 DateTime.TryParse(prop.GetString(), null, DateTimeStyles.AdjustToUniversal, out var dt2))
        {
            return dt2;
        }

        return null;
    }

    private static string? GetMongoObjectId(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var prop))
        {
            return null;
        }

        if (prop.ValueKind == JsonValueKind.Object && prop.TryGetProperty("$oid", out var oid))
        {
            return oid.GetString();
        }

        if (prop.ValueKind == JsonValueKind.String)
        {
            return prop.GetString();
        }

        return null;
    }
}
