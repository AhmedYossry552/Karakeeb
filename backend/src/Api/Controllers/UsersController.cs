using System;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Wallet;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly IWalletService _walletService;
    private readonly IPointsService _pointsService;
    private readonly IOrderRepository _orderRepository;
    private readonly IUserPointsHistoryRepository _userPointsHistoryRepository;
    private readonly IConfiguration _configuration;
    private static readonly HttpClient HttpClient = new HttpClient();
    private readonly RecyclingDbContext _dbContext;

    public UsersController(
        IUserRepository userRepository,
        IWalletService walletService,
        IPointsService pointsService,
        IOrderRepository orderRepository,
        IUserPointsHistoryRepository userPointsHistoryRepository,
        IConfiguration configuration,
        RecyclingDbContext dbContext)
    {
        _userRepository = userRepository;
        _walletService = walletService;
        _pointsService = pointsService;
        _orderRepository = orderRepository;
        _userPointsHistoryRepository = userPointsHistoryRepository;
        _configuration = configuration;
        _dbContext = dbContext;
    }

    private string? GetCurrentUserId()
    {
        return User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    private bool IsAdmin()
    {
        return User.IsInRole("admin");
    }

    private bool CanAccessUser(string userId)
    {
        var currentUserId = GetCurrentUserId();
        if (string.IsNullOrEmpty(currentUserId))
        {
            return false;
        }

        if (currentUserId == userId)
        {
            return true;
        }

        return IsAdmin();
    }

    // GET /api/users
    // Admin-only endpoint that lists users with optional role/search filters
    // and pagination, matching the Node.js getAllUsers contract.
    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] string? role = null,
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string sortBy = "createdAt",
        [FromQuery] string sortOrder = "desc")
    {
        if (page < 1)
        {
            page = 1;
        }

        if (limit < 1)
        {
            limit = 10;
        }

        var query = _dbContext.Users
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(role))
        {
            query = query.Where(u => u.Role == role);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();
            query = query.Where(u => u.Name.Contains(term) || u.Email.Contains(term));
        }

        var totalUsers = await query.CountAsync();

        var descending = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);

        query = (sortBy ?? string.Empty).ToLowerInvariant() switch
        {
            "name" => descending ? query.OrderByDescending(u => u.Name) : query.OrderBy(u => u.Name),
            "email" => descending ? query.OrderByDescending(u => u.Email) : query.OrderBy(u => u.Email),
            _ => descending ? query.OrderByDescending(u => u.CreatedAt) : query.OrderBy(u => u.CreatedAt)
        };

        var skip = (page - 1) * limit;

        var users = await query
            .Skip(skip)
            .Take(limit)
            .ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();

        var deliveryProfiles = await _dbContext.DeliveryProfiles
            .AsNoTracking()
            .Where(dp => userIds.Contains(dp.UserId))
            .ToListAsync();

        var deliveryProfileMap = deliveryProfiles.ToDictionary(dp => dp.UserId, dp => dp);

        var data = users.Select(u =>
        {
            deliveryProfileMap.TryGetValue(u.Id, out var deliveryProfile);

            object? attachments = null;

            if (string.Equals(u.Role, "delivery", StringComparison.OrdinalIgnoreCase))
            {
                attachments = new
                {
                    status = deliveryProfile?.Status ?? (u.IsApproved ? "approved" : "pending"),
                    approvedAt = deliveryProfile?.ApprovedAt,
                    revokedAt = deliveryProfile?.RevokedAt,
                    revokeReason = deliveryProfile?.RevokeReason
                };
            }

            return new
            {
                _id = u.Id,
                name = u.Name,
                email = u.Email,
                phoneNumber = u.PhoneNumber,
                provider = u.Provider ?? "none",
                role = u.Role,
                isApproved = u.IsApproved,
                imgUrl = u.ImgUrl,
                rating = u.Rating,
                totalReviews = u.TotalReviews,
                createdAt = u.CreatedAt,
                updatedAt = u.UpdatedAt,
                lastActiveAt = u.LastActiveAt,
                attachments
            };
        }).ToList();

        var totalPages = (int)Math.Ceiling(totalUsers / (double)limit);

        var pagination = new
        {
            currentPage = page,
            totalPages,
            totalUsers,
            hasNextPage = page < totalPages,
            hasPrevPage = page > 1,
            limit
        };

        var filters = new
        {
            role = string.IsNullOrWhiteSpace(role) ? null : role,
            search = string.IsNullOrWhiteSpace(search) ? null : search
        };

        return Ok(new
        {
            success = true,
            data,
            pagination,
            filters
        });
    }

    private string GetStripeSecretKey()
    {
        var key = _configuration["Stripe:SecretKey"] ?? Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Stripe secret key is not configured");
        }

        return key;
    }

    // GET /api/users/{id}
    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetUserById(string id)
    {
        if (!CanAccessUser(id))
        {
            return Forbid();
        }

        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        decimal balance = 0;
        try
        {
            balance = await _walletService.GetUserBalanceAsync(id);
        }
        catch
        {
            // Ignore wallet errors for profile endpoint
        }

        var attachments = new
        {
            balance
        };

        var result = new
        {
            _id = user.Id,
            name = user.Name,
            email = user.Email,
            phoneNumber = user.PhoneNumber,
            provider = user.Provider ?? "none",
            role = user.Role,
            isApproved = user.IsApproved,
            imgUrl = user.ImgUrl,
            createdAt = user.CreatedAt,
            updatedAt = user.UpdatedAt,
            lastActiveAt = user.LastActiveAt,
            attachments
        };

        return Ok(result);
    }

    // GET /api/users/{id}/transactions
    [HttpGet("{id}/transactions")]
    [Authorize]
    public async Task<IActionResult> GetUserTransactions(string id)
    {
        if (!CanAccessUser(id))
        {
            return Forbid();
        }

        var transactions = await _walletService.GetUserTransactionsAsync(id);
        return Ok(transactions);
    }

    // POST /api/users/{id}/transactions
    [HttpPost("{id}/transactions")]
    [Authorize]
    public async Task<IActionResult> AddUserTransaction(string id, [FromBody] AddUserTransactionRequest request)
    {
        if (!CanAccessUser(id))
        {
            return Forbid();
        }

        try
        {
            var result = await _walletService.AddUserTransactionAsync(id, request);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST /api/users/{id}/stripe-customer
    [HttpPost("{id}/stripe-customer")]
    [Authorize]
    public async Task<IActionResult> CreateStripeCustomer(string id)
    {
        if (!CanAccessUser(id))
        {
            return Forbid();
        }

        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }
        try
        {
            var secretKey = GetStripeSecretKey();
            // If we already have a Stripe customer ID, verify that it still exists in Stripe.
            if (!string.IsNullOrWhiteSpace(user.StripeCustomerId))
            {
                var getRequest = new HttpRequestMessage(HttpMethod.Get, $"https://api.stripe.com/v1/customers/{user.StripeCustomerId}");
                getRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

                var getResponse = await HttpClient.SendAsync(getRequest);
                var getBody = await getResponse.Content.ReadAsStringAsync();

                if (getResponse.IsSuccessStatusCode)
                {
                    // Existing customer is valid in Stripe - reuse it
                    return Ok(new { stripeCustomerId = user.StripeCustomerId });
                }

                // If Stripe says resource_missing for this customer, treat it as stale and create a new one.
                try
                {
                    using var errorDoc = JsonDocument.Parse(getBody);
                    if (errorDoc.RootElement.TryGetProperty("error", out var errorElement) &&
                        errorElement.TryGetProperty("code", out var codeElement) &&
                        string.Equals(codeElement.GetString(), "resource_missing", StringComparison.OrdinalIgnoreCase))
                    {
                        // Clear invalid customer ID and fall through to creation logic below
                        user.StripeCustomerId = null;
                    }
                    else
                    {
                        return StatusCode(StatusCodes.Status502BadGateway, new { error = "Stripe error", details = getBody });
                    }
                }
                catch
                {
                    return StatusCode(StatusCodes.Status502BadGateway, new { error = "Stripe error", details = getBody });
                }
            }

            // Create a new Stripe customer if we don't have a valid one.
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.stripe.com/v1/customers");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);
            request.Content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("email", user.Email),
                new KeyValuePair<string, string>("name", user.Name),
                new KeyValuePair<string, string>("phone", user.PhoneNumber ?? string.Empty),
                new KeyValuePair<string, string>("metadata[userId]", user.Id)
            });

            var response = await HttpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode(StatusCodes.Status502BadGateway, new { error = "Stripe error", details = body });
            }

            using var doc = JsonDocument.Parse(body);
            var stripeCustomerId = doc.RootElement.GetProperty("id").GetString();

            if (string.IsNullOrWhiteSpace(stripeCustomerId))
            {
                return StatusCode(StatusCodes.Status502BadGateway, new { error = "Invalid Stripe response" });
            }

            user.StripeCustomerId = stripeCustomerId;
            await _userRepository.UpdateAsync(user);

            return Ok(new { stripeCustomerId });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    public class CreatePaymentIntentRequest
    {
        public long Amount { get; set; }
    }

    // POST /api/users/{id}/create-payment-intent
    [HttpPost("{id}/create-payment-intent")]
    [Authorize]
    public async Task<IActionResult> CreatePaymentIntent(string id, [FromBody] CreatePaymentIntentRequest request)
    {
        if (!CanAccessUser(id))
        {
            return Forbid();
        }

        if (request == null || request.Amount <= 0)
        {
            return BadRequest(new { error = "Amount must be greater than zero" });
        }

        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        if (string.IsNullOrWhiteSpace(user.StripeCustomerId))
        {
            return BadRequest(new { error = "Stripe customer ID not found" });
        }

        try
        {
            var secretKey = GetStripeSecretKey();

            var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.stripe.com/v1/payment_intents");
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);
            httpRequest.Content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("amount", request.Amount.ToString()),
                new KeyValuePair<string, string>("currency", "egp"),
                new KeyValuePair<string, string>("customer", user.StripeCustomerId!),
                new KeyValuePair<string, string>("automatic_payment_methods[enabled]", "true")
            });

            var response = await HttpClient.SendAsync(httpRequest);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode(StatusCodes.Status502BadGateway, new { error = "Stripe error", details = body });
            }

            using var doc = JsonDocument.Parse(body);
            var clientSecret = doc.RootElement.GetProperty("client_secret").GetString();

            if (string.IsNullOrWhiteSpace(clientSecret))
            {
                return StatusCode(StatusCodes.Status502BadGateway, new { error = "Invalid Stripe response" });
            }

            return Ok(new { clientSecret });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    // GET /api/users/{id}/payments
    [HttpGet("{id}/payments")]
    [Authorize]
    public async Task<IActionResult> GetUserPayments(string id)
    {
        if (!CanAccessUser(id))
        {
            return Forbid();
        }

        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound(new { error = "User not found" });
        }

        if (string.IsNullOrWhiteSpace(user.StripeCustomerId))
        {
            return BadRequest(new { error = "Stripe customer ID not found" });
        }

        try
        {
            var secretKey = GetStripeSecretKey();
            var url = $"https://api.stripe.com/v1/charges?customer={Uri.EscapeDataString(user.StripeCustomerId)}&limit=100";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

            var response = await HttpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode(StatusCodes.Status502BadGateway, new { error = "Stripe error", details = body });
            }

            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("data", out var data))
            {
                return StatusCode(StatusCodes.Status502BadGateway, new { error = "Invalid Stripe response" });
            }

            var dataJson = data.GetRawText();
            return Content(dataJson, "application/json");
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { error = ex.Message });
        }
    }

    public class DeductPointsRequest
    {
        public int Points { get; set; }
        public string? Reason { get; set; }
    }

    // GET /api/users/{userId}/points
    [HttpGet("{userId}/points")]
    [Authorize]
    public async Task<IActionResult> GetUserPoints(string userId, [FromQuery] int page = 1, [FromQuery] int limit = 10)
    {
        if (!CanAccessUser(userId))
        {
            return Forbid();
        }

        try
        {
            var result = await _pointsService.GetUserPointsAsync(userId, page, limit);

            var pointsHistory = result.History.Select(h => new
            {
                orderId = h.OrderId,
                points = h.Points,
                type = h.Type,
                reason = h.Reason,
                timestamp = h.Timestamp
            });

            var pagination = result.Pagination;

            return Ok(new
            {
                success = true,
                data = new
                {
                    userId = result.UserId,
                    name = result.Name,
                    email = result.Email,
                    totalPoints = result.TotalPoints,
                    pointsHistory,
                    totalRecycled = result.TotalRecycled,
                    pagination = new
                    {
                        currentPage = pagination.CurrentPage,
                        totalItems = pagination.TotalItems,
                        totalPages = pagination.TotalPages,
                        hasMore = pagination.HasNextPage
                    }
                }
            });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    // POST /api/users/{userId}/points/deduct
    [HttpPost("{userId}/points/deduct")]
    [Authorize(Roles = "admin,customer")]
    public async Task<IActionResult> DeductUserPoints(string userId, [FromBody] DeductPointsRequest request)
    {
        if (!CanAccessUser(userId))
        {
            return Forbid();
        }

        try
        {
            await _pointsService.DeductUserPointsAsync(userId, request.Points, request.Reason);

            var user = await _userRepository.GetByIdAsync(userId);
            var totalPoints = user?.TotalPoints ?? 0;

            return Ok(new
            {
                success = true,
                message = "Points deducted successfully",
                data = new
                {
                    userId,
                    totalPoints,
                    pointsDeducted = request.Points
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }


    [HttpPost("{userId}/points/convert")]
    [Authorize]
    public async Task<IActionResult> ConvertUserPointsToWallet(string userId, [FromBody] ConvertPointsRequest? request)
    {
        if (!CanAccessUser(userId))
        {
            return Forbid();
        }

        const int PointsPerEgp = 19;

        try
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { success = false, message = "User not found" });
            }

            if (!string.Equals(user.Role, "customer", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Only customers can convert points to wallet balance"
                });
            }

            var totalPoints = user.TotalPoints;

            if (totalPoints <= 0 || totalPoints < PointsPerEgp)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Not enough points to convert"
                });
            }

            decimal amountToConvert;
            int pointsToUse;

            if (request == null || !request.Amount.HasValue || request.Amount.Value <= 0)
            {
                // Convert the maximum whole EGP amount possible from available points
                amountToConvert = Math.Floor(totalPoints / PointsPerEgp);
                if (amountToConvert <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Not enough points to convert"
                    });
                }

                pointsToUse = (int)(amountToConvert * PointsPerEgp);
            }
            else
            {
                var requestedAmount = request.Amount.Value;
                var requiredPoints = (int)Math.Ceiling(requestedAmount * PointsPerEgp);

                if (requiredPoints <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Invalid amount to convert"
                    });
                }

                if (totalPoints < requiredPoints)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Not enough points for requested amount"
                    });
                }

                amountToConvert = requestedAmount;
                pointsToUse = requiredPoints;
            }

            await _pointsService.DeductUserPointsAsync(userId, pointsToUse,
                "Points converted to wallet cashback");

            // Refresh user to get remaining points
            user = await _userRepository.GetByIdAsync(userId) ?? user;
            var remainingPoints = user.TotalPoints;

            var walletResult = await _walletService.AddUserTransactionAsync(userId,
                new AddUserTransactionRequest
                {
                    Type = "cashback",
                    Gateway = "points_conversion",
                    Amount = amountToConvert
                });

            return Ok(new
            {
                success = true,
                message = "Points converted to wallet cashback successfully",
                data = new
                {
                    userId,
                    pointsUsed = pointsToUse,
                    cashAdded = amountToConvert,
                    remainingPoints,
                    newBalance = walletResult.NewBalance,
                    transaction = walletResult.Transaction
                }
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // GET /api/users/points/leaderboard
    [HttpGet("points/leaderboard")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPointsLeaderboard([FromQuery] int limit = 10)
    {
        var result = await _pointsService.GetLeaderboardAsync(limit);

        var data = result.Select(u => new
        {
            rank = u.Rank,
            userId = u.UserId,
            name = u.Name,
            email = u.Email,
            totalPoints = u.TotalPoints,
            imageUrl = u.ImageUrl
        });

        return Ok(new
        {
            success = true,
            data
        });
    }

    // PATCH /api/users/{id}
    [HttpPatch("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateUser(string id, [FromBody] UpdateUserRequest request)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null)
        {
            return NotFound(new { message = "User not found" });
        }

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            user.Role = request.Role;
        }

        await _userRepository.UpdateAsync(user);

        return Ok(new
        {
            success = true,
            message = "User updated successfully"
        });
    }

    public class UpdateUserRequest
    {
        public string? Role { get; set; }
    }

    public class ConvertPointsRequest
    {
        public decimal? Amount { get; set; }
    }

    // POST /api/users/{userId}/points/retroactive
    [HttpPost("{userId}/points/retroactive")]
    [Authorize]
    public async Task<IActionResult> AddRetroactivePoints(string userId)
    {
        if (!CanAccessUser(userId))
        {
            return Forbid();
        }

        try
        {
            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
            {
                return NotFound(new { success = false, message = "User not found" });
            }

            // Get all orders for this user
            var allOrders = await _orderRepository.GetByUserIdAsync(userId);
            
            // Filter to only completed orders
            var completedOrders = allOrders.Where(o => 
                string.Equals(o.Status, "completed", StringComparison.OrdinalIgnoreCase)
            ).ToList();
            
            if (completedOrders.Count == 0)
            {
                return Ok(new
                {
                    success = true,
                    message = "No completed orders found",
                    data = new
                    {
                        userId,
                        ordersProcessed = 0,
                        pointsAdded = 0,
                        totalPoints = user.TotalPoints
                    }
                });
            }

            // Get all points history for this user to check which orders already have points
            // Use a large page size to get all history (or we could paginate if needed)
            var (allHistory, totalCount) = await _userPointsHistoryRepository.GetByUserIdPagedAsync(userId, 1, 10000);
            var existingOrderIds = allHistory
                .Where(h => !string.IsNullOrWhiteSpace(h.OrderId))
                .Select(h => h.OrderId!)
                .ToHashSet();

            int ordersProcessed = 0;
            int totalPointsAdded = 0;

            foreach (var order in completedOrders)
            {
                // Skip if points already added for this order
                if (existingOrderIds.Contains(order.Id))
                {
                    continue;
                }

                // Calculate points for this order
                var orderPoints = (int)order.Items.Sum(i => i.Points * i.Quantity);
                
                if (orderPoints > 0)
                {
                    try
                    {
                        await _pointsService.AddUserPointsAsync(
                            userId, 
                            orderPoints, 
                            order.Id, 
                            $"Order completed - retroactive points"
                        );
                        ordersProcessed++;
                        totalPointsAdded += orderPoints;
                    }
                    catch (Exception ex)
                    {
                        // Log error but continue with other orders
                        Console.WriteLine($"Error adding retroactive points for order {order.Id}: {ex.Message}");
                    }
                }
            }

            // Refresh user to get updated total points
            user = await _userRepository.GetByIdAsync(userId);
            var currentTotalPoints = user?.TotalPoints ?? 0;

            return Ok(new
            {
                success = true,
                message = $"Retroactive points added successfully",
                data = new
                {
                    userId,
                    ordersProcessed,
                    pointsAdded = totalPointsAdded,
                    totalPoints = currentTotalPoints
                }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                success = false,
                message = "Error processing retroactive points",
                error = ex.Message
            });
        }
    }
}
