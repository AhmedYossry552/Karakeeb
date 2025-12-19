using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface IOrderRepository
{
    Task<Order?> GetByIdAsync(string id);
    Task<IReadOnlyList<Order>> GetByUserIdAsync(string userId);
    Task AddAsync(Order order);
    Task UpdateAsync(Order order);
    Task<IReadOnlyList<Order>> GetByUserIdAndStatusAsync(string userId, string status);
    Task<(IReadOnlyList<Order> Items, int TotalCount)> GetPagedForUserAsync(string userId, int page, int pageSize, string? status);
    Task<(IReadOnlyList<Order> Items, int TotalCount)> GetPagedForAdminAsync(int page, int pageSize, string? status, string? userRole, System.DateTime? date, string? search);
    Task DeleteAsync(Order order);
    Task<IReadOnlyList<Order>> GetByCourierIdAsync(string courierId);
    Task<IReadOnlyList<Order>> GetByCourierIdAndStatusAsync(string courierId, string status);
    Task<int> CountCompletedByUserAsync(string userId);
    Task<decimal> GetBuyerCashTotalAsync();
}
