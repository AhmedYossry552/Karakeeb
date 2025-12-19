using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class UserWalletRepository : IUserWalletRepository
{
    private readonly RecyclingDbContext _context;

    public UserWalletRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public Task<UserWallet?> GetByUserIdAsync(string userId)
    {
        return _context.UserWallets.SingleOrDefaultAsync(w => w.UserId == userId);
    }

    public async Task AddAsync(UserWallet wallet)
    {
        _context.UserWallets.Add(wallet);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(UserWallet wallet)
    {
        _context.UserWallets.Update(wallet);
        await _context.SaveChangesAsync();
    }
}
