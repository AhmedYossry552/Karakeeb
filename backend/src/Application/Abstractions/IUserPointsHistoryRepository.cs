using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface IUserPointsHistoryRepository
{
    Task AddAsync(UserPointsHistory history);
    Task<(IReadOnlyList<UserPointsHistory> Items, int TotalCount)> GetByUserIdPagedAsync(string userId, int page, int pageSize);
}
