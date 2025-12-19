using System.Collections.Generic;

namespace Recycling.Application.Contracts.Analytics;

public class OrderAnalyticsDto
{
    public int TotalOrders { get; set; }
    public int CompletedOrders { get; set; }
    public IReadOnlyList<OrderStatusCountDto> StatusCounts { get; set; } = new List<OrderStatusCountDto>();
    public int[] DailyOrders { get; set; } = new int[7];
    public PointsAnalyticsDto PointsAnalytics { get; set; } = new();
}
