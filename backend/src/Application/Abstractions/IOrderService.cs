using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Application.Contracts.Common;
using Recycling.Application.Contracts.Orders;

namespace Recycling.Application.Abstractions;

public interface IOrderService
{
    Task<OrderDto> CreateOrderFromCartAsync(string userId, CreateOrderRequest request);
    Task<IReadOnlyList<OrderDto>> GetUserOrdersAsync(string userId);
    Task<OrderDto?> GetOrderByIdAsync(string userId, string orderId);
    Task<IReadOnlyList<OrderDto>> GetUserOrdersByStatusAsync(string userId, string status);
    Task<bool> UpdateOrderStatusAsync(string userId, string orderId, string status, string? reason, string? notes);
    Task<bool> CancelOrderAsync(string userId, string orderId, string? reason, string? notes);
    Task<UserOrdersPagedResultDto> GetUserOrdersPagedAsync(string userId, int page, int limit, string? status);
    Task<PagedResult<AdminOrderListItemDto>> GetAdminOrdersAsync(int page, int limit, string? status, string? userRole, string? date, string? search);
    Task<bool> AdminUpdateOrderStatusAsync(string orderId, string status, string? reason, string? notes);
    Task<bool> AdminDeleteOrderAsync(string orderId);
    Task<bool> DeleteUserOrderAsync(string userId, string orderId);
    Task<bool> AssignCourierAsync(string orderId, string courierId, string status);
    Task<IReadOnlyList<OrderDto>> GetCourierAssignedOrdersAsync(string courierUserId);
    Task<IReadOnlyList<OrderDto>> GetOrdersByCourierAsync(string courierUserId);
    Task<bool> CompleteOrderWithProofAsync(string courierUserId, string orderId, string? notes, string? quantityNotes, string? updatedQuantitiesJson, string? photoPath, string? photoUrl);
}
