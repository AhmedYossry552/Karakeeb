namespace Recycling.Application.Contracts.Analytics;

public class PointsAnalyticsDto
{
    public decimal TotalPointsDistributed { get; set; }
    public decimal TotalItemsRecycled { get; set; }
    public decimal AveragePointsPerOrder { get; set; }
}
