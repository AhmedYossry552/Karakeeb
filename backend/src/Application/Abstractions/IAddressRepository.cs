using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface IAddressRepository
{
    Task<Address?> GetByIdAsync(string id);
    Task<IReadOnlyList<Address>> GetByUserIdAsync(string userId);
    Task<IReadOnlyList<Address>> GetByIdsAsync(IReadOnlyList<string> ids);
    Task<IReadOnlyList<Address>> GetAllAsync();
    Task AddAsync(Address address);
    Task UpdateAsync(Address address);
    Task DeleteAsync(Address address);
}
