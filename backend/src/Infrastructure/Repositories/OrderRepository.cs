using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class OrderRepository : IOrderRepository
{
    private readonly RecyclingDbContext _context;

    public OrderRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public Task<Order?> GetByIdAsync(string id)
    {
        return _context.Orders
            .Include(o => o.Items)
            .Include(o => o.DeliveryProofs)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id);
    }

    public async Task<IReadOnlyList<Order>> GetByUserIdAsync(string userId)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task AddAsync(Order order)
    {
        _context.Orders.Add(order);
        await _context.SaveChangesAsync();
        _context.Entry(order).State = EntityState.Detached;
    }

    public async Task UpdateAsync(Order order)
    {
        _context.Orders.Update(order);
        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<Order>> GetByUserIdAndStatusAsync(string userId, string status)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.UserId == userId && o.Status == status)
            .OrderByDescending(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<(IReadOnlyList<Order> Items, int TotalCount)> GetPagedForUserAsync(string userId, int page, int pageSize, string? status)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var query = _context.Orders
            .Include(o => o.Items)
            .Where(o => o.UserId == userId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (string.Equals(status, "incoming", StringComparison.OrdinalIgnoreCase))
            {
                var incomingStatuses = new[] { "pending", "assigntocourier", "collected" };
                query = query.Where(o => incomingStatuses.Contains(o.Status));
            }
            else
            {
                query = query.Where(o => o.Status == status);
            }
        }

        var total = await query.CountAsync();

        var items = await query
            .Include(o => o.StatusHistory)
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return (items, total);
    }

    public async Task<(IReadOnlyList<Order> Items, int TotalCount)> GetPagedForAdminAsync(int page, int pageSize, string? status, string? userRole, DateTime? date, string? search)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var query = _context.Orders
            .Include(o => o.Items)
            .Include(o => o.DeliveryProofs)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var statuses = status
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            if (statuses.Length == 1)
            {
                var single = statuses[0];
                query = query.Where(o => o.Status == single);
            }
            else
            {
                query = query.Where(o => statuses.Contains(o.Status));
            }
        }

        if (!string.IsNullOrWhiteSpace(userRole))
        {
            var roles = userRole
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            var userIdsWithRoles = _context.Users
                .Where(u => roles.Contains(u.Role))
                .Select(u => u.Id);

            query = query.Where(o => userIdsWithRoles.Contains(o.UserId));
        }

        if (date.HasValue)
        {
            var start = date.Value.Date;
            var end = start.AddDays(1);
            query = query.Where(o => o.CreatedAt >= start && o.CreatedAt < end);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim();

            var userIdsMatchingSearch = _context.Users
                .Where(u => u.Name.Contains(term) || u.Email.Contains(term))
                .Select(u => u.Id);

            query = query.Where(o =>
                o.Id.Contains(term) ||
                o.Status.Contains(term) ||
                userIdsMatchingSearch.Contains(o.UserId));
        }

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return (items, total);
    }

    public async Task DeleteAsync(Order order)
    {
        _context.Orders.Remove(order);
        await _context.SaveChangesAsync();
    }

    public Task<int> CountCompletedByUserAsync(string userId)
    {
        return _context.Orders.CountAsync(o => o.UserId == userId && o.Status == "completed");
    }

    public async Task<IReadOnlyList<Order>> GetByCourierIdAsync(string courierId)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.CourierId == courierId)
            .OrderByDescending(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Order>> GetByCourierIdAndStatusAsync(string courierId, string status)
    {
        return await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.CourierId == courierId && o.Status == status)
            .OrderByDescending(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<decimal> GetBuyerCashTotalAsync()
    {
        var query = from order in _context.Orders
                    join user in _context.Users on order.UserId equals user.Id
                    where user.Role == "buyer"
                          && order.PaymentMethod == "cash"
                          && order.Status == "completed"
                    select (decimal?)order.TotalAmount;

        var total = await query.SumAsync() ?? 0m;
        return total;
    }
}
