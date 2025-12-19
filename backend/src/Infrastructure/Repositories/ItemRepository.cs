using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class ItemRepository : IItemRepository
{
    private readonly RecyclingDbContext _context;

    public ItemRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public async Task<(IReadOnlyList<Item> Items, int TotalCount)> GetPagedAsync(int page, int pageSize)
    {
        var query = _context.Items.AsNoTracking().OrderBy(i => i.NameEn);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public async Task<(IReadOnlyList<Item> Items, int TotalCount)> GetByCategoryNameEnPagedAsync(string categoryNameEn, int page, int pageSize)
    {
        var category = await _context.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.NameEn == categoryNameEn);

        if (category is null)
        {
            return (Array.Empty<Item>(), 0);
        }

        var query = _context.Items
            .AsNoTracking()
            .Where(i => i.CategoryId == category.Id)
            .OrderBy(i => i.NameEn);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public Task<Item?> GetByIdAsync(string id)
    {
        return _context.Items.AsNoTracking().FirstOrDefaultAsync(i => i.Id == id);
    }

    public async Task UpdateAsync(Item item)
    {
        _context.Items.Update(item);
        await _context.SaveChangesAsync();
    }
}
