using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class AddressRepository : IAddressRepository
{
    private readonly RecyclingDbContext _context;

    public AddressRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public Task<Address?> GetByIdAsync(string id)
    {
        return _context.Addresses.AsNoTracking().FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<IReadOnlyList<Address>> GetByUserIdAsync(string userId)
    {
        return await _context.Addresses
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Address>> GetByIdsAsync(IReadOnlyList<string> ids)
    {
        if (ids == null || ids.Count == 0)
        {
            return Array.Empty<Address>();
        }

        return await _context.Addresses
            .AsNoTracking()
            .Where(a => ids.Contains(a.Id))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<Address>> GetAllAsync()
    {
        return await _context.Addresses
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
    }

    public async Task AddAsync(Address address)
    {
        _context.Addresses.Add(address);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(Address address)
    {
        _context.Addresses.Update(address);
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Address address)
    {
        _context.Addresses.Remove(address);
        await _context.SaveChangesAsync();
    }
}
