using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Common;
using Recycling.Application.Contracts.Orders;
using Recycling.Application.Contracts.Addresses;
using Recycling.Domain.Entities;

namespace Recycling.Application.Services;

public class OrderService : IOrderService
{
    private readonly ICartRepository _cartRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IUserRepository _userRepository;
    private readonly IPointsService _pointsService;
    private readonly INotificationService _notificationService;
    private readonly IStockService _stockService;
    private readonly IAddressRepository _addressRepository;

    public OrderService(
        ICartRepository cartRepository,
        IOrderRepository orderRepository,
        IUserRepository userRepository,
        IPointsService pointsService,
        INotificationService notificationService,
        IStockService stockService,
        IAddressRepository addressRepository)
    {
        _cartRepository = cartRepository;
        _orderRepository = orderRepository;
        _userRepository = userRepository;
        _pointsService = pointsService;
        _notificationService = notificationService;
        _stockService = stockService;
        _addressRepository = addressRepository;
    }

    public async Task<OrderDto> CreateOrderFromCartAsync(string userId, CreateOrderRequest request)
    {
        var cart = await _cartRepository.GetByUserIdAsync(userId)
                   ?? throw new InvalidOperationException("Cart not found");

        if (cart.Items.Count == 0)
        {
            throw new InvalidOperationException("Cart is empty");
        }

        var now = DateTime.UtcNow;

        var order = new Order
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            AddressId = request.AddressId,
            Status = "pending",
            PaymentMethod = request.PaymentMethod,
            DeliveryFee = request.DeliveryFee,
            HasQuantityAdjustments = !string.IsNullOrEmpty(request.QuantityAdjustmentNotes),
            QuantityAdjustmentNotes = request.QuantityAdjustmentNotes,
            EstimatedWeight = request.EstimatedWeight,
            CreatedAt = now,
            UpdatedAt = now
        };

        foreach (var cartItem in cart.Items)
        {
            order.Items.Add(new OrderItem
            {
                ItemId = cartItem.ItemId,
                NameEn = cartItem.NameEn,
                NameAr = cartItem.NameAr,
                CategoryNameEn = cartItem.CategoryNameEn,
                CategoryNameAr = cartItem.CategoryNameAr,
                Image = cartItem.Image,
                MeasurementUnit = cartItem.MeasurementUnit,
                Points = cartItem.Points,
                Price = cartItem.Price,
                Quantity = cartItem.Quantity
            });
        }

        order.TotalAmount = order.Items.Sum(i => i.Price * i.Quantity) + order.DeliveryFee;

        await _orderRepository.AddAsync(order);

        var user = await _userRepository.GetByIdAsync(userId);
        if (user != null && string.Equals(user.Role, "buyer", StringComparison.OrdinalIgnoreCase))
        {
            await _stockService.UpdateItemQuantitiesAsync(order.Items, increase: false);
        }

        // Clear cart after creating order
        cart.Items.Clear();
        cart.UpdatedAt = now;
        await _cartRepository.UpdateAsync(cart);

        // Try to auto-assign a courier based on address proximity and courier load.
        // Ignore failures so order creation is not blocked if no suitable courier is found.
        try
        {
            var assigned = await AutoAssignCourierAsync(order.Id);
            if (assigned)
            {
                var updatedOrder = await _orderRepository.GetByIdAsync(order.Id);
                if (updatedOrder != null)
                {
                    order = updatedOrder;
                }
            }
        }
        catch
        {
        }

        return MapOrder(order);
    }

    public async Task<IReadOnlyList<OrderDto>> GetUserOrdersByStatusAsync(string userId, string status)
    {
        var orders = await _orderRepository.GetByUserIdAndStatusAsync(userId, status);
        return orders.Select(MapOrder).ToList();
    }

    public async Task<bool> UpdateOrderStatusAsync(string userId, string orderId, string status, string? reason, string? notes)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            throw new ArgumentException("Status is required", nameof(status));
        }

        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null || order.UserId != userId)
        {
            return false;
        }

        order.Status = status;
        order.UpdatedAt = DateTime.UtcNow;

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = status,
            Timestamp = DateTime.UtcNow,
            UpdatedBy = userId,
            Notes = notes
        });

        await _orderRepository.UpdateAsync(order);
        return true;
    }

    public async Task<bool> CancelOrderAsync(string userId, string orderId, string? reason, string? notes)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null || order.UserId != userId)
        {
            return false;
        }

        var previousStatus = order.Status;

        if (string.Equals(order.Status, "assigntocourier", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (string.Equals(order.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        order.Status = "cancelled";
        order.UpdatedAt = DateTime.UtcNow;

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = "cancelled",
            Timestamp = DateTime.UtcNow,
            UpdatedBy = userId,
            Notes = string.IsNullOrWhiteSpace(reason) ? notes : reason
        });

        await _orderRepository.UpdateAsync(order);

        if (string.Equals(previousStatus, "completed", StringComparison.OrdinalIgnoreCase))
        {
            var pointsToDeduct = (int)order.Items.Sum(i => i.Points * i.Quantity);
            if (pointsToDeduct > 0)
            {
                try
                {
                    await _pointsService.DeductUserPointsAsync(userId, pointsToDeduct, "Order cancelled");
                }
                catch
                {
                }
            }
        }

        try
        {
            var cancelReason = string.IsNullOrWhiteSpace(reason) ? "Order cancelled by customer" : reason;
            await _notificationService.CreateOrderCancelledNotificationAsync(order.UserId, order.Id, cancelReason);

            if (!string.Equals(previousStatus, "cancelled", StringComparison.OrdinalIgnoreCase))
            {
                await _notificationService.CreateOrderStatusChangeNotificationAsync(order.UserId, order.Id, previousStatus, "cancelled");
            }
        }
        catch
        {
        }

        return true;
    }

    public async Task<IReadOnlyList<OrderDto>> GetUserOrdersAsync(string userId)
    {
        var orders = await _orderRepository.GetByUserIdAsync(userId);
        return orders.Select(MapOrder).ToList();
    }

    public async Task<UserOrdersPagedResultDto> GetUserOrdersPagedAsync(string userId, int page, int limit, string? status)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        var (orders, total) = await _orderRepository.GetPagedForUserAsync(userId, page, limit, status);
        var totalCompleted = await _orderRepository.CountCompletedByUserAsync(userId);

        var data = orders.Select(MapOrder).ToList();
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return new UserOrdersPagedResultDto
        {
            Data = data,
            Pagination = new PaginationInfo
            {
                CurrentPage = page,
                ItemsPerPage = limit,
                TotalItems = total,
                TotalPages = totalPages,
                HasNextPage = page < totalPages
            },
            TotalCompletedOrders = totalCompleted
        };
    }

    public async Task<OrderDto?> GetOrderByIdAsync(string userId, string orderId)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null || order.UserId != userId)
        {
            return null;
        }

        return MapOrder(order);
    }

    public async Task<PagedResult<AdminOrderListItemDto>> GetAdminOrdersAsync(int page, int limit, string? status, string? userRole, string? date, string? search)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        DateTime? parsedDate = null;
        if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out var d))
        {
            parsedDate = d;
        }

        var (orders, total) = await _orderRepository.GetPagedForAdminAsync(page, limit, status, userRole, parsedDate, search);

        var userIds = orders.Select(o => o.UserId).Distinct().ToList();
        var users = await _userRepository.GetByIdsAsync(userIds);
        var userLookup = users.ToDictionary(u => u.Id, u => u);

        var addressIds = orders
            .Where(o => !string.IsNullOrWhiteSpace(o.AddressId))
            .Select(o => o.AddressId!)
            .Distinct()
            .ToList();

        var addresses = addressIds.Count > 0
            ? await _addressRepository.GetByIdsAsync(addressIds)
            : Array.Empty<Address>();
        var addressLookup = addresses.ToDictionary(a => a.Id, a => a);

        var courierIds = orders
            .Where(o => !string.IsNullOrWhiteSpace(o.CourierId))
            .Select(o => o.CourierId!)
            .Distinct()
            .ToList();

        var couriers = courierIds.Count > 0
            ? await _userRepository.GetByIdsAsync(courierIds)
            : Array.Empty<User>();
        var courierLookup = couriers.ToDictionary(c => c.Id, c => c);

        var data = orders.Select(o =>
        {
            userLookup.TryGetValue(o.UserId, out var user);

            AddressDto? addressDto = null;
            if (!string.IsNullOrWhiteSpace(o.AddressId) && addressLookup.TryGetValue(o.AddressId!, out var address))
            {
                addressDto = new AddressDto
                {
                    Id = address.Id,
                    City = address.City,
                    Area = address.Area,
                    Street = address.Street,
                    Building = address.Building,
                    Floor = address.Floor,
                    Apartment = address.Apartment,
                    Landmark = address.Landmark,
                    Notes = address.Notes,
                    CreatedAt = address.CreatedAt,
                    UpdatedAt = address.UpdatedAt
                };
            }

            string? courierId = null;
            string? courierName = null;
            if (!string.IsNullOrWhiteSpace(o.CourierId) && courierLookup.TryGetValue(o.CourierId!, out var courier))
            {
                courierId = courier.Id;
                courierName = courier.Name;
            }

            // Get latest delivery proof, if any
            var latestProof = o.DeliveryProofs
                .OrderByDescending(p => p.UploadedAt)
                .FirstOrDefault();

            string? deliveryProofUrl = null;
            if (latestProof != null)
            {
                // Prefer PhotoUrl (e.g. Cloudinary or absolute URL); fall back to PhotoPath (e.g. local path/relative URL)
                if (!string.IsNullOrWhiteSpace(latestProof.PhotoUrl))
                {
                    deliveryProofUrl = latestProof.PhotoUrl;
                }
                else if (!string.IsNullOrWhiteSpace(latestProof.PhotoPath))
                {
                    deliveryProofUrl = latestProof.PhotoPath;
                }
            }

            return new AdminOrderListItemDto
            {
                Id = o.Id,
                UserId = o.UserId,
                UserName = user?.Name,
                UserEmail = user?.Email,
                UserRole = user?.Role,
                UserPhoneNumber = user?.PhoneNumber,
                Status = o.Status,
                PaymentMethod = o.PaymentMethod,
                DeliveryFee = o.DeliveryFee,
                TotalAmount = o.TotalAmount,
                CreatedAt = o.CreatedAt,
                CollectedAt = o.CollectedAt,
                CompletedAt = o.CompletedAt,
                Items = o.Items.Select(i => new OrderItemDto
                {
                    Id = i.Id,
                    ItemId = i.ItemId,
                    NameEn = i.NameEn,
                    NameAr = i.NameAr,
                    CategoryNameEn = i.CategoryNameEn,
                    CategoryNameAr = i.CategoryNameAr,
                    Image = i.Image,
                    MeasurementUnit = i.MeasurementUnit,
                    Points = i.Points,
                    Price = i.Price,
                    Quantity = i.Quantity
                }).ToList(),
                Address = addressDto,
                StatusHistory = o.StatusHistory
                    .OrderBy(h => h.Timestamp)
                    .Select(h => new AdminOrderStatusHistoryDto
                    {
                        Status = h.Status,
                        Timestamp = h.Timestamp,
                        UpdatedBy = h.UpdatedBy,
                        Notes = h.Notes
                    })
                    .ToList(),
                CourierId = courierId,
                CourierName = courierName,
                DeliveryProofPhotoUrl = deliveryProofUrl,
                DeliveryProofNotes = latestProof?.Notes,
                DeliveryProofUploadedAt = latestProof?.UploadedAt
            };
        }).ToList();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return new PagedResult<AdminOrderListItemDto>
        {
            Data = data,
            Pagination = new PaginationInfo
            {
                CurrentPage = page,
                ItemsPerPage = limit,
                TotalItems = total,
                TotalPages = totalPages,
                HasNextPage = page < totalPages
            }
        };
    }

    public async Task<bool> AdminUpdateOrderStatusAsync(string orderId, string status, string? reason, string? notes)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            throw new ArgumentException("Status is required", nameof(status));
        }

        var newStatus = status.ToLowerInvariant();

        var validStatuses = new HashSet<string> { "pending", "assigntocourier", "collected", "completed", "cancelled" };
        if (!validStatuses.Contains(newStatus))
        {
            throw new ArgumentException("Invalid status value", nameof(status));
        }

        if (newStatus == "cancelled" && string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("Cancellation reason is required when cancelling an order", nameof(reason));
        }

        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null)
        {
            return false;
        }

        var user = await _userRepository.GetByIdAsync(order.UserId);
        var userRole = user?.Role ?? "customer";

        var currentStatus = order.Status.ToLowerInvariant();

        var transitionsForBuyer = new Dictionary<string, string[]>
        {
            ["pending"] = new[] { "assigntocourier", "cancelled" },
            ["assigntocourier"] = new[] { "completed", "cancelled", "pending" },
            ["collected"] = new[] { "completed", "cancelled" },
            ["completed"] = Array.Empty<string>(),
            ["cancelled"] = Array.Empty<string>()
        };

        var transitionsForCustomer = new Dictionary<string, string[]>
        {
            ["pending"] = new[] { "assigntocourier", "cancelled" },
            ["assigntocourier"] = new[] { "collected", "cancelled", "pending" },
            ["collected"] = new[] { "completed", "cancelled" },
            ["completed"] = Array.Empty<string>(),
            ["cancelled"] = Array.Empty<string>()
        };

        var transitions = string.Equals(userRole, "buyer", StringComparison.OrdinalIgnoreCase)
            ? transitionsForBuyer
            : transitionsForCustomer;

        if (!transitions.TryGetValue(currentStatus, out var allowed) || !allowed.Contains(newStatus))
        {
            return false;
        }

        var now = DateTime.UtcNow;
        var previousStatus = order.Status;

        order.Status = newStatus;
        order.UpdatedAt = now;

        if (newStatus == "collected" && order.CollectedAt == null)
        {
            order.CollectedAt = now;
        }

        if (newStatus == "completed")
        {
            order.CompletedAt = now;
        }

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = newStatus,
            Timestamp = now,
            UpdatedBy = "admin",
            Notes = string.IsNullOrWhiteSpace(reason) ? notes : reason
        });

        if (newStatus == "completed" && !string.Equals(previousStatus, "completed", StringComparison.OrdinalIgnoreCase))
        {
            if (!string.Equals(userRole, "buyer", StringComparison.OrdinalIgnoreCase))
            {
                var totalPoints = (int)order.Items.Sum(i => i.Points * i.Quantity);
                if (totalPoints > 0)
                {
                    try
                    {
                        await _pointsService.AddUserPointsAsync(order.UserId, totalPoints, order.Id, $"Order completed by admin - {userRole} order");
                    }
                    catch (Exception ex)
                    {
                        // Log error but don't block status update
                        // Points can be added retroactively if needed
                        Console.WriteLine($"Error adding points for order {order.Id}: {ex.Message}");
                        Console.WriteLine($"Stack trace: {ex.StackTrace}");
                    }
                }
            }

            try
            {
                await _stockService.UpdateItemQuantitiesAsync(order.Items, increase: true);
            }
            catch
            {
            }
        }

        await _orderRepository.UpdateAsync(order);

        try
        {
            if (newStatus == "assigntocourier" && !string.Equals(previousStatus, "assigntocourier", StringComparison.OrdinalIgnoreCase))
            {
                await _notificationService.CreateOrderAssignedNotificationAsync(order.UserId, order.Id);
            }

            if (newStatus == "cancelled" && !string.Equals(previousStatus, "cancelled", StringComparison.OrdinalIgnoreCase))
            {
                var cancelReason = string.IsNullOrWhiteSpace(reason) ? "Order cancelled by admin" : reason;
                await _notificationService.CreateOrderCancelledNotificationAsync(order.UserId, order.Id, cancelReason);
            }
            else if (newStatus == "completed" && !string.Equals(previousStatus, "completed", StringComparison.OrdinalIgnoreCase))
            {
                await _notificationService.CreateOrderCompletedNotificationAsync(order.UserId, order.Id);
            }

            if (!string.Equals(previousStatus, newStatus, StringComparison.OrdinalIgnoreCase))
            {
                await _notificationService.CreateOrderStatusChangeNotificationAsync(order.UserId, order.Id, previousStatus, newStatus);
            }
        }
        catch
        {
        }

        return true;
    }

    public async Task<bool> AdminDeleteOrderAsync(string orderId)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null)
        {
            return false;
        }

        var wasCompleted = string.Equals(order.Status, "completed", StringComparison.OrdinalIgnoreCase);
        var pointsToDeduct = 0;
        if (wasCompleted)
        {
            pointsToDeduct = (int)order.Items.Sum(i => i.Points * i.Quantity);
        }

        await _orderRepository.DeleteAsync(order);

        if (wasCompleted && pointsToDeduct > 0)
        {
            try
            {
                await _pointsService.DeductUserPointsAsync(order.UserId, pointsToDeduct, "Order deleted by admin - points refund");
            }
            catch
            {
            }
        }

        return true;
    }

    public async Task<bool> DeleteUserOrderAsync(string userId, string orderId)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null || order.UserId != userId)
        {
            return false;
        }

        var wasCompleted = string.Equals(order.Status, "completed", StringComparison.OrdinalIgnoreCase);
        var pointsToDeduct = 0;
        if (wasCompleted)
        {
            pointsToDeduct = (int)order.Items.Sum(i => i.Points * i.Quantity);
        }

        await _orderRepository.DeleteAsync(order);

        if (wasCompleted && pointsToDeduct > 0)
        {
            try
            {
                await _pointsService.DeductUserPointsAsync(userId, pointsToDeduct, "Order deleted by user - points refund");
            }
            catch
            {
            }
        }

        return true;
    }

    public async Task<bool> AutoAssignCourierAsync(string orderId)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null || string.IsNullOrWhiteSpace(order.AddressId))
        {
            return false;
        }

        var orderAddress = await _addressRepository.GetByIdAsync(order.AddressId);
        if (orderAddress == null)
        {
            return false;
        }

        var allCouriers = await _userRepository.GetByRoleAsync("delivery");
        var couriers = allCouriers
            .Where(c => c.IsApproved)
            .ToList();

        if (couriers.Count == 0)
        {
            return false;
        }

        var activeStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "pending",
            "assigntocourier",
            "collected"
        };

        string? bestCourierId = null;
        var bestDistanceScore = int.MaxValue;
        var bestLoad = int.MaxValue;

        foreach (var courier in couriers)
        {
            var courierAddresses = await _addressRepository.GetByUserIdAsync(courier.Id);
            var courierAddress = courierAddresses.FirstOrDefault();

            var distanceScore = ComputeAreaProximity(orderAddress, courierAddress);

            var courierOrders = await _orderRepository.GetByCourierIdAsync(courier.Id);
            var activeOrders = courierOrders.Count(o => activeStatuses.Contains(o.Status));

            if (distanceScore < bestDistanceScore ||
                (distanceScore == bestDistanceScore && activeOrders < bestLoad))
            {
                bestCourierId = courier.Id;
                bestDistanceScore = distanceScore;
                bestLoad = activeOrders;
            }
        }

        if (bestCourierId == null)
        {
            return false;
        }

        return await AssignCourierAsync(order.Id, bestCourierId, "assigntocourier");
    }

    private static int ComputeAreaProximity(Address orderAddress, Address? courierAddress)
    {
        if (courierAddress == null)
        {
            return 2;
        }

        var sameCity = string.Equals(orderAddress.City, courierAddress.City, StringComparison.OrdinalIgnoreCase);
        var sameArea = string.Equals(orderAddress.Area, courierAddress.Area, StringComparison.OrdinalIgnoreCase);

        if (sameCity && sameArea)
        {
            return 0;
        }

        if (sameCity)
        {
            return 1;
        }

        return 2;
    }

    public async Task<bool> AssignCourierAsync(string orderId, string courierId, string status)
    {
        if (string.IsNullOrWhiteSpace(courierId))
        {
            throw new ArgumentException("Courier id is required", nameof(courierId));
        }

        if (string.IsNullOrWhiteSpace(status))
        {
            throw new ArgumentException("Status is required", nameof(status));
        }

        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null)
        {
            return false;
        }

        var courier = await _userRepository.GetByIdAsync(courierId);
        if (courier == null || !string.Equals(courier.Role, "delivery", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var user = await _userRepository.GetByIdAsync(order.UserId);
        var userRole = user?.Role ?? "customer";

        var currentStatus = order.Status.ToLowerInvariant();
        var newStatus = status.ToLowerInvariant();

        // simplified status transitions similar to Node
        var transitionsForBuyer = new Dictionary<string, string[]>
        {
            ["pending"] = new[] { "assigntocourier", "cancelled" },
            ["assigntocourier"] = new[] { "completed", "cancelled" },
            ["collected"] = new[] { "completed", "cancelled" },
            ["completed"] = Array.Empty<string>(),
            ["cancelled"] = Array.Empty<string>()
        };

        var transitionsForCustomer = new Dictionary<string, string[]>
        {
            ["pending"] = new[] { "assigntocourier", "cancelled" },
            ["assigntocourier"] = new[] { "collected", "cancelled" },
            ["collected"] = new[] { "completed", "cancelled" },
            ["completed"] = Array.Empty<string>(),
            ["cancelled"] = Array.Empty<string>()
        };

        var transitions = string.Equals(userRole, "buyer", StringComparison.OrdinalIgnoreCase)
            ? transitionsForBuyer
            : transitionsForCustomer;

        if (!transitions.TryGetValue(currentStatus, out var allowed) || !allowed.Contains(newStatus))
        {
            return false;
        }

        var now = DateTime.UtcNow;

        order.CourierId = courierId;
        order.Status = newStatus;
        order.UpdatedAt = now;

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = newStatus,
            Timestamp = now,
            UpdatedBy = "admin"
        });

        await _orderRepository.UpdateAsync(order);

        try
        {
            if (newStatus == "assigntocourier" && !string.Equals(currentStatus, "assigntocourier", StringComparison.OrdinalIgnoreCase))
            {
                await _notificationService.CreateOrderAssignedNotificationAsync(order.UserId, order.Id);
            }

            if (!string.Equals(currentStatus, newStatus, StringComparison.OrdinalIgnoreCase))
            {
                await _notificationService.CreateOrderStatusChangeNotificationAsync(order.UserId, order.Id, currentStatus, newStatus);
            }
        }
        catch
        {
        }

        return true;
    }

    public async Task<IReadOnlyList<OrderDto>> GetCourierAssignedOrdersAsync(string courierUserId)
    {
        var orders = await _orderRepository.GetByCourierIdAndStatusAsync(courierUserId, "assigntocourier");
        return orders.Select(MapOrder).ToList();
    }

    public async Task<IReadOnlyList<OrderDto>> GetOrdersByCourierAsync(string courierUserId)
    {
        var orders = await _orderRepository.GetByCourierIdAsync(courierUserId);
        return orders.Select(MapOrder).ToList();
    }

    public async Task<bool> CompleteOrderWithProofAsync(
        string courierUserId,
        string orderId,
        string? notes,
        string? quantityNotes,
        string? updatedQuantitiesJson,
        string? photoPath,
        string? photoUrl)
    {
        var order = await _orderRepository.GetByIdAsync(orderId);
        if (order == null)
        {
            return false;
        }

        if (!string.Equals(order.CourierId, courierUserId, StringComparison.Ordinal))
        {
            // Courier not assigned to this order
            return false;
        }

        if (!string.Equals(order.Status, "assigntocourier", StringComparison.OrdinalIgnoreCase))
        {
            // Only orders assigned to courier can be processed here
            return false;
        }

        var user = await _userRepository.GetByIdAsync(order.UserId);
        var userRole = user?.Role ?? "customer";

        var previousStatus = order.Status;

        var now = DateTime.UtcNow;

        // Quantity adjustments for customer orders only
        if (string.Equals(userRole, "customer", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(updatedQuantitiesJson))
        {
            try
            {
                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                var quantities = JsonSerializer.Deserialize<Dictionary<string, UpdatedQuantityDto>>(updatedQuantitiesJson, jsonOptions);
                if (quantities != null)
                {
                    foreach (var item in order.Items)
                    {
                        var key = item.Id.ToString();
                        if (quantities.TryGetValue(key, out var q))
                        {
                            var originalQuantity = item.Quantity;
                            if (!item.OriginalQuantity.HasValue)
                            {
                                item.OriginalQuantity = originalQuantity;
                            }

                            item.Quantity = q.ActualQuantity;
                            item.QuantityAdjusted = originalQuantity != q.ActualQuantity;
                        }
                    }

                    order.HasQuantityAdjustments = order.Items.Any(i => i.QuantityAdjusted);
                }
            }
            catch
            {
                // Ignore quantity parsing errors and continue processing
            }

            if (!string.IsNullOrWhiteSpace(quantityNotes))
            {
                order.QuantityAdjustmentNotes = quantityNotes;
            }
        }

        if (!string.IsNullOrWhiteSpace(notes))
        {
            // Use notes as estimated weight similar to Node implementation
            order.EstimatedWeight = decimal.TryParse(notes, out var weight) ? weight : order.EstimatedWeight;
        }

        // Update status based on user role
        if (string.Equals(userRole, "buyer", StringComparison.OrdinalIgnoreCase))
        {
            order.Status = "completed";
            order.CompletedAt = now;
        }
        else
        {
            order.Status = "collected";
            order.CollectedAt = now;
        }

        // Add delivery proof if provided
        if (!string.IsNullOrWhiteSpace(photoPath) || !string.IsNullOrWhiteSpace(photoUrl))
        {
            order.DeliveryProofs.Add(new OrderDeliveryProof
            {
                PhotoPath = photoPath ?? string.Empty,
                PhotoUrl = photoUrl ?? photoPath ?? string.Empty,
                UploadedAt = now,
                Notes = notes,
                CompletedBy = courierUserId
            });
        }

        // Build history notes
        var historyNotes = new List<string>();
        if (string.Equals(userRole, "customer", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(order.QuantityAdjustmentNotes))
        {
            historyNotes.Add($"Quantity adjustments: {order.QuantityAdjustmentNotes}");
        }
        if (!string.IsNullOrWhiteSpace(notes))
        {
            historyNotes.Add($"Notes: {notes}");
        }

        order.StatusHistory.Add(new OrderStatusHistory
        {
            Status = order.Status,
            Timestamp = now,
            UpdatedBy = courierUserId,
            Notes = historyNotes.Count > 0
                ? string.Join(". ", historyNotes)
                : string.Equals(userRole, "buyer", StringComparison.OrdinalIgnoreCase)
                    ? "Order completed by courier"
                    : "Order collected by courier"
        });

        order.UpdatedAt = now;

        if (string.Equals(userRole, "buyer", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                await _stockService.UpdateItemQuantitiesAsync(order.Items, increase: true);
            }
            catch
            {
            }
        }

        await _orderRepository.UpdateAsync(order);

        try
        {
            if (string.Equals(order.Status, "completed", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(previousStatus, "completed", StringComparison.OrdinalIgnoreCase))
            {
                await _notificationService.CreateOrderCompletedNotificationAsync(order.UserId, order.Id);
            }

            if (!string.Equals(previousStatus, order.Status, StringComparison.OrdinalIgnoreCase))
            {
                await _notificationService.CreateOrderStatusChangeNotificationAsync(order.UserId, order.Id, previousStatus, order.Status);
            }
        }
        catch
        {
        }

        return true;
    }

    private sealed class UpdatedQuantityDto
    {
        public decimal ActualQuantity { get; set; }
    }

    private static OrderDto MapOrder(Order order)
    {
        var items = order.Items.Select(i => new OrderItemDto
        {
            Id = i.Id,
            ItemId = i.ItemId,
            NameEn = i.NameEn,
            NameAr = i.NameAr,
            CategoryNameEn = i.CategoryNameEn,
            CategoryNameAr = i.CategoryNameAr,
            Image = i.Image,
            MeasurementUnit = i.MeasurementUnit,
            Points = i.Points,
            Price = i.Price,
            Quantity = i.Quantity
        }).ToList();

        return new OrderDto
        {
            Id = order.Id,
            AddressId = order.AddressId,
            Status = order.Status,
            PaymentMethod = order.PaymentMethod,
            DeliveryFee = order.DeliveryFee,
            TotalAmount = order.TotalAmount,
            CreatedAt = order.CreatedAt,
            CompletedAt = order.CompletedAt,
            Items = items
        };
    }
}
