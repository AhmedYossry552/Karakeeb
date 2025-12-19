using System.Threading.Tasks;
using Recycling.Application.Contracts.Cart;

namespace Recycling.Application.Abstractions;

public interface ICartService
{
    Task<CartDto> GetCartAsync(string userId);
    Task<CartDto> AddItemAsync(string userId, AddCartItemRequest request);
    Task<CartDto> UpdateItemAsync(string userId, UpdateCartItemRequest request);
    Task<CartDto> RemoveItemAsync(string userId, int cartItemId);
    Task ClearCartAsync(string userId);
    Task SaveCartAsync(string userId, SaveCartRequest request);
}
