using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface IUserWalletRepository
{
    Task<UserWallet?> GetByUserIdAsync(string userId);
    Task AddAsync(UserWallet wallet);
    Task UpdateAsync(UserWallet wallet);
}
