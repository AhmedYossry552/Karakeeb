using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Analytics;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class OrderAnalyticsRepository : IOrderAnalyticsRepository
{
    private readonly RecyclingDbContext _context;

    public OrderAnalyticsRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public async Task<OrderAnalyticsDto> GetOrderAnalyticsAsync()
    {
        var totalOrders = await _context.Orders.CountAsync();
        var completedOrders = await _context.Orders.CountAsync(o => o.Status == "completed");

        var statusCounts = await _context.Orders
            .GroupBy(o => o.Status)
            .Select(g => new OrderStatusCountDto
            {
                Status = g.Key,
                Count = g.Count()
            })
            .ToListAsync();

        // Calculate current week bounds (Monday .. Sunday) in UTC
        var now = DateTime.UtcNow;
        var currentDay = now.DayOfWeek; // Sunday = 0
        var daysSinceMonday = currentDay == DayOfWeek.Sunday ? 6 : (int)currentDay - 1;
        var startOfWeek = now.Date.AddDays(-daysSinceMonday);
        var endOfWeek = startOfWeek.AddDays(7).AddTicks(-1);

        var dailyGroups = await _context.Orders
            .Where(o => o.CreatedAt >= startOfWeek && o.CreatedAt <= endOfWeek)
            .GroupBy(o => o.CreatedAt.DayOfWeek)
            .Select(g => new
            {
                Day = g.Key,
                Count = g.Count()
            })
            .ToListAsync();

        var dailyOrders = new int[7];

        foreach (var g in dailyGroups)
        {
            int index = g.Day switch
            {
                DayOfWeek.Monday => 0,
                DayOfWeek.Tuesday => 1,
                DayOfWeek.Wednesday => 2,
                DayOfWeek.Thursday => 3,
                DayOfWeek.Friday => 4,
                DayOfWeek.Saturday => 5,
                DayOfWeek.Sunday => 6,
                _ => 0
            };

            if (index >= 0 && index < 7)
            {
                dailyOrders[index] = g.Count;
            }
        }

        ///////////////////////////////////////////////////////////////////////////

        // Points analytics (completed orders only)
        var pointsAgg = await (
                from o in _context.Orders
                where o.Status == "completed"
                join i in _context.OrderItems on o.Id equals i.OrderId
                select new { i.Points, i.Quantity }
            )
            .GroupBy(_ => 1)
            .Select(g => new
            {
                TotalPointsDistributed = g.Sum(x => (decimal)x.Points * x.Quantity),
                TotalItemsRecycled = g.Sum(x => x.Quantity)
            })
            .FirstOrDefaultAsync();

        decimal totalPointsDistributed = pointsAgg?.TotalPointsDistributed ?? 0m;
        decimal totalItemsRecycled = pointsAgg?.TotalItemsRecycled ?? 0m;
        decimal averagePointsPerOrder = completedOrders > 0
            ? totalPointsDistributed / completedOrders
            : 0m;

        return new OrderAnalyticsDto
        {
            TotalOrders = totalOrders,
            CompletedOrders = completedOrders,
            StatusCounts = statusCounts,
            DailyOrders = dailyOrders,
            PointsAnalytics = new PointsAnalyticsDto
            {
                TotalPointsDistributed = totalPointsDistributed,
                TotalItemsRecycled = totalItemsRecycled,
                AveragePointsPerOrder = decimal.Round(averagePointsPerOrder, 2)
            }
        };
    }

    public async Task<IReadOnlyList<TopCityDto>> GetTopCitiesByOrdersAsync(int limit)
    {
        if (limit < 1)
        {
            limit = 10;
        }

        var query = from o in _context.Orders
                    join a in _context.Addresses on o.AddressId equals a.Id
                    where a.City != null
                    group o by a.City into g
                    orderby g.Count() descending
                    select new TopCityDto
                    {
                        City = g.Key!,
                        TotalOrders = g.Count()
                    };

        var result = await query.Take(limit).ToListAsync();
        return result;
    }

    public async Task<IReadOnlyList<TopMaterialDto>> GetTopMaterialsRecycledAsync(string? category, int limit)
    {
        if (limit < 1)
        {
            limit = 4;
        }

        var query = from o in _context.Orders
                    where o.Status == "completed"
                    join i in _context.OrderItems on o.Id equals i.OrderId
                    select new { o, i };

        if (!string.IsNullOrWhiteSpace(category))
        {
            var normalized = category.Trim().ToLower();

            query = query.Where(x =>
                (!string.IsNullOrEmpty(x.i.CategoryNameEn) && x.i.CategoryNameEn.ToLower() == normalized) ||
                (!string.IsNullOrEmpty(x.i.CategoryNameAr) && x.i.CategoryNameAr.ToLower() == normalized));
        }

        var materials = await query
            .GroupBy(x => x.i.NameEn)
            .Select(g => new TopMaterialDto
            {
                NameEn = g.Key,
                NameAr = g.Max(x => x.i.NameAr),
                TotalQuantity = g.Sum(x => x.i.Quantity),
                TotalPoints = g.Sum(x => (decimal)x.i.Points * x.i.Quantity),
                Image = g.Max(x => x.i.Image),
                CategoryNameEn = g.Max(x => x.i.CategoryNameEn),
                CategoryNameAr = g.Max(x => x.i.CategoryNameAr),
                Unit = g.Max(x => x.i.MeasurementUnit) == 1 ? "kg" : "pieces",
                OrderCount = g.Count()
            })
            .OrderByDescending(m => m.TotalQuantity)
            .Take(limit)
            .ToListAsync();

        return materials;
    }
}
