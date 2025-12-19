using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class UserPointsHistoryRepository : IUserPointsHistoryRepository
{
    private readonly RecyclingDbContext _context;

    public UserPointsHistoryRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(UserPointsHistory history)
    {
        _context.UserPointsHistories.Add(history);
        await _context.SaveChangesAsync();
    }

    public async Task<(IReadOnlyList<UserPointsHistory> Items, int TotalCount)> GetByUserIdPagedAsync(string userId, int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var query = _context.UserPointsHistories
            .Where(h => h.UserId == userId);

        var total = await query.CountAsync();

        var items = await query
            .OrderByDescending(h => h.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return (items, total);
    }
}
