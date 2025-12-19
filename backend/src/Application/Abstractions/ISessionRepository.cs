using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface ISessionRepository
{
    Task AddAsync(Session session);
    Task<Session?> GetBySessionIdAsync(string sessionId);
    Task<IReadOnlyList<Session>> GetByUserIdAsync(string userId);
    Task UpdateAsync(Session session);
}
