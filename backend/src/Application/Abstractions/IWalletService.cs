using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Application.Contracts.Wallet;

namespace Recycling.Application.Abstractions;

public interface IWalletService
{
    Task<AddUserTransactionResponse> AddUserTransactionAsync(string userId, AddUserTransactionRequest request);
    Task<IReadOnlyList<UserTransactionDto>> GetUserTransactionsAsync(string userId);
    Task<decimal> GetUserBalanceAsync(string userId);
}
