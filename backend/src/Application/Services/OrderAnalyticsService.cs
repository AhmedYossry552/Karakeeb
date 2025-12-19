using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Analytics;

namespace Recycling.Application.Services;

public class OrderAnalyticsService : IOrderAnalyticsService
{
    private readonly IOrderAnalyticsRepository _repository;

    public OrderAnalyticsService(IOrderAnalyticsRepository repository)
    {
        _repository = repository;
    }

    public Task<OrderAnalyticsDto> GetOrderAnalyticsAsync()
        => _repository.GetOrderAnalyticsAsync();

    public Task<IReadOnlyList<TopCityDto>> GetTopCitiesByOrdersAsync(int limit)
        => _repository.GetTopCitiesByOrdersAsync(limit);

    public Task<IReadOnlyList<TopMaterialDto>> GetTopMaterialsRecycledAsync(string? category, int limit)
        => _repository.GetTopMaterialsRecycledAsync(category, limit);
}
