using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class DeliveryProfileRepository : IDeliveryProfileRepository
{
    private readonly RecyclingDbContext _context;

    public DeliveryProfileRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public async Task<DeliveryProfile?> GetByUserIdAsync(string userId)
    {
        return await _context.DeliveryProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId);
    }

    public async Task AddAsync(DeliveryProfile profile)
    {
        _context.DeliveryProfiles.Add(profile);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(DeliveryProfile profile)
    {
        _context.DeliveryProfiles.Update(profile);
        await _context.SaveChangesAsync();
    }
}
