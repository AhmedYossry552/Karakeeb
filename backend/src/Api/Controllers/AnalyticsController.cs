using System;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api")]
public class AnalyticsController : ControllerBase
{
    private readonly IOrderAnalyticsService _orderAnalyticsService;
    private readonly RecyclingDbContext _dbContext;

    public AnalyticsController(IOrderAnalyticsService orderAnalyticsService, RecyclingDbContext dbContext)
    {
        _orderAnalyticsService = orderAnalyticsService;
        _dbContext = dbContext;
    }

    // GET /api/orders/analytics
    [HttpGet("orders/analytics")]
    public async Task<IActionResult> GetOrderAnalytics()
    {
        var result = await _orderAnalyticsService.GetOrderAnalyticsAsync();

        // Map status counts into a dictionary keyed by status, like the Node.js API
        var statusCountsMap = result.StatusCounts
            .GroupBy(s => s.Status)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Count));

        return Ok(new
        {
            success = true,
            data = new
            {
                totalOrders = result.TotalOrders,
                completedOrders = result.CompletedOrders,
                statusCounts = statusCountsMap,
                dailyOrders = result.DailyOrders,
                pointsAnalytics = new
                {
                    totalPointsDistributed = result.PointsAnalytics.TotalPointsDistributed,
                    totalItemsRecycled = result.PointsAnalytics.TotalItemsRecycled,
                    averagePointsPerOrder = result.PointsAnalytics.AveragePointsPerOrder
                }
            }
        });
    }

    // GET /api/stats
    // Returns monthly user signup statistics for the last year,
    // matching the Node.js getUserStats shape: { success: true, data: [{ label, count }, ...] }
    [HttpGet("stats")]
    public async Task<IActionResult> GetUserStats()
    {
        var oneYearAgo = DateTime.UtcNow.AddYears(-1);

        var stats = await _dbContext.Users
            .Where(u => u.CreatedAt >= oneYearAgo)
            .GroupBy(u => new { u.CreatedAt.Year, u.CreatedAt.Month })
            .Select(g => new
            {
                Year = g.Key.Year,
                Month = g.Key.Month,
                Count = g.Count()
            })
            .OrderBy(x => x.Year)
            .ThenBy(x => x.Month)
            .ToListAsync();

        string[] monthsMap =
        {
            "",
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
        };

        var formatted = stats.Select(item => new
        {
            label = $"{monthsMap[item.Month]} {item.Year}",
            count = item.Count
        });

        return Ok(new
        {
            success = true,
            data = formatted
        });
    }

    // GET /api/orders/analytics/top-cities?limit=
    [HttpGet("orders/analytics/top-cities")]
    public async Task<IActionResult> GetTopCities([FromQuery] int limit = 10)
    {
        var result = await _orderAnalyticsService.GetTopCitiesByOrdersAsync(limit);

        var data = result.Select(c => new
        {
            city = c.City,
            totalOrders = c.TotalOrders
        });

        return Ok(new
        {
            success = true,
            data
        });
    }

    // GET /api/top-materials-recycled?category=&limit=
    [HttpGet("top-materials-recycled")]
    public async Task<IActionResult> GetTopMaterials([FromQuery] string? category = null, [FromQuery] int limit = 4)
    {
        var result = await _orderAnalyticsService.GetTopMaterialsRecycledAsync(category, limit);
        return Ok(result);
    }
}
