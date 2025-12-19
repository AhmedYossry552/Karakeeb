using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class CategoryRepository : ICategoryRepository
{
    private readonly RecyclingDbContext _context;

    public CategoryRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public async Task<(IReadOnlyList<Category> Items, int TotalCount)> GetPagedAsync(int page, int pageSize)
    {
        var query = _context.Categories.AsNoTracking().OrderBy(c => c.NameEn);

        var total = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (items, total);
    }

    public Task<Category?> GetByNameEnAsync(string nameEn)
    {
        return _context.Categories.AsNoTracking()
            .FirstOrDefaultAsync(c => c.NameEn == nameEn);
    }

    public Task<Category?> GetByIdAsync(string id)
    {
        return _context.Categories.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);
    }
}
