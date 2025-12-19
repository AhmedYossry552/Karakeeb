using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface IUserTransactionRepository
{
    Task AddAsync(UserTransaction transaction);
    Task<IReadOnlyList<UserTransaction>> GetByUserIdAsync(string userId);
    Task<(decimal totalCashback, decimal totalWithdrawals)> GetTotalsAsync();
}
