using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class UserTransactionRepository : IUserTransactionRepository
{
    private readonly RecyclingDbContext _context;

    public UserTransactionRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(UserTransaction transaction)
    {
        _context.UserTransactions.Add(transaction);
        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<UserTransaction>> GetByUserIdAsync(string userId)
    {
        return await _context.UserTransactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.TransactionDate)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<(decimal totalCashback, decimal totalWithdrawals)> GetTotalsAsync()
    {
        var query = _context.UserTransactions.AsNoTracking();

        var totalCashback = await query
            .Where(t => t.Type == "cashback")
            .SumAsync(t => (decimal?)t.Amount) ?? 0m;

        var totalWithdrawals = await query
            .Where(t => t.Type == "withdrawal")
            .SumAsync(t => (decimal?)t.Amount) ?? 0m;

        return (totalCashback, totalWithdrawals);
    }
}
