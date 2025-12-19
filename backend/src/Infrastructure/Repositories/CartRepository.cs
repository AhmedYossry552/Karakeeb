using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class CartRepository : ICartRepository
{
    private readonly RecyclingDbContext _context;

    public CartRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public Task<Cart?> GetByUserIdAsync(string userId)
    {
        return _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.UserId == userId);
    }

    public Task<Cart?> GetByIdAsync(string id)
    {
        return _context.Carts
            .Include(c => c.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task AddAsync(Cart cart)
    {
        _context.Carts.Add(cart);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Cart cart)
    {
        _context.Carts.Update(cart);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveItemAsync(int cartItemId)
    {
        var item = await _context.CartItems.FindAsync(cartItemId);
        if (item != null)
        {
            _context.CartItems.Remove(item);
            await _context.SaveChangesAsync();
        }
    }

    public async Task ClearAsync(Cart cart)
    {
        var items = _context.CartItems.Where(i => i.CartId == cart.Id);
        _context.CartItems.RemoveRange(items);
        await _context.SaveChangesAsync();
    }
}
