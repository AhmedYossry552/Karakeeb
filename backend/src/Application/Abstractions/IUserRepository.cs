using System.Threading.Tasks;
using Recycling.Domain.Entities;
using System.Collections.Generic;

namespace Recycling.Application.Abstractions;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(string id);
    Task<User?> GetByRefreshTokenAsync(string refreshToken);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task<bool> EmailExistsAsync(string email);
    Task<IReadOnlyList<User>> GetByIdsAsync(IReadOnlyList<string> ids);
    Task<IReadOnlyList<User>> GetTopByTotalPointsAsync(int limit);
    Task<IReadOnlyList<User>> GetByRoleAsync(string role);
}
