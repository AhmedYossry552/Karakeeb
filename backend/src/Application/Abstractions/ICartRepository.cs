using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface ICartRepository
{
    Task<Cart?> GetByUserIdAsync(string userId);
    Task<Cart?> GetByIdAsync(string id);
    Task AddAsync(Cart cart);
    Task UpdateAsync(Cart cart);
    Task RemoveItemAsync(int cartItemId);
    Task ClearAsync(Cart cart);
}
