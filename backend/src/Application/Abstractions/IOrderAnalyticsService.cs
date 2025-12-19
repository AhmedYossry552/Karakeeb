using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Application.Contracts.Analytics;

namespace Recycling.Application.Abstractions;

public interface IOrderAnalyticsService
{
    Task<OrderAnalyticsDto> GetOrderAnalyticsAsync();
    Task<IReadOnlyList<TopCityDto>> GetTopCitiesByOrdersAsync(int limit);
    Task<IReadOnlyList<TopMaterialDto>> GetTopMaterialsRecycledAsync(string? category, int limit);
}
