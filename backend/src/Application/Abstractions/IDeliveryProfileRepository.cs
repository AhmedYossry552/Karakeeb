using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface IDeliveryProfileRepository
{
    Task<DeliveryProfile?> GetByUserIdAsync(string userId);
    Task AddAsync(DeliveryProfile profile);
    Task UpdateAsync(DeliveryProfile profile);
}
