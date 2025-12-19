using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class BuyerProfileRepository : IBuyerProfileRepository
{
    private readonly RecyclingDbContext _context;

    public BuyerProfileRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public async Task<BuyerProfile?> GetByUserIdAsync(string userId)
    {
        return await _context.BuyerProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task AddAsync(BuyerProfile profile)
    {
        _context.BuyerProfiles.Add(profile);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(BuyerProfile profile)
    {
        _context.BuyerProfiles.Update(profile);
        await _context.SaveChangesAsync();
    }
}
