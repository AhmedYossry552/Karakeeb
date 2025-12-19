using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface IBuyerProfileRepository
{
    Task<BuyerProfile?> GetByUserIdAsync(string userId);
    Task AddAsync(BuyerProfile profile);
    Task UpdateAsync(BuyerProfile profile);
}
