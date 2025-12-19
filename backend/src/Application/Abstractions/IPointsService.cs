using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Application.Contracts.Points;

namespace Recycling.Application.Abstractions;

public interface IPointsService
{
    Task AddUserPointsAsync(string userId, int points, string? orderId, string? reason);
    Task DeductUserPointsAsync(string userId, int points, string? reason);
    Task<UserPointsSummaryDto> GetUserPointsAsync(string userId, int page, int limit);
    Task<IReadOnlyList<PointsLeaderboardEntryDto>> GetLeaderboardAsync(int limit);
    Task<IReadOnlyList<OrderWithPointsDto>> GetUserOrdersWithPointsAsync(string userId);
}
