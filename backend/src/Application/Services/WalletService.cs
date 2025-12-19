using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Wallet;
using Recycling.Domain.Entities;

namespace Recycling.Application.Services;

public class WalletService : IWalletService
{
    private readonly IUserRepository _userRepository;
    private readonly IUserWalletRepository _walletRepository;
    private readonly IUserTransactionRepository _transactionRepository;

    public WalletService(
        IUserRepository userRepository,
        IUserWalletRepository walletRepository,
        IUserTransactionRepository transactionRepository)
    {
        _userRepository = userRepository;
        _walletRepository = walletRepository;
        _transactionRepository = transactionRepository;
    }

    public async Task<AddUserTransactionResponse> AddUserTransactionAsync(string userId, AddUserTransactionRequest request)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("User id is required", nameof(userId));
        }

        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        var type = string.IsNullOrWhiteSpace(request.Type)
            ? "withdrawal"
            : request.Type.Trim().ToLowerInvariant();

        if (type == "withdrawal" && string.IsNullOrWhiteSpace(request.Gateway))
        {
            throw new ArgumentException("Gateway is required with withdrawal method", nameof(request.Gateway));
        }

        if (type != "cashback" && type != "withdrawal")
        {
            throw new ArgumentException("Invalid transaction type", nameof(request.Type));
        }

        if (request.Amount <= 0)
        {
            throw new ArgumentException("Amount must be greater than zero", nameof(request.Amount));
        }

        var user = await _userRepository.GetByIdAsync(userId)
                   ?? throw new InvalidOperationException("User not found");

        var wallet = await _walletRepository.GetByUserIdAsync(userId);
        if (wallet == null)
        {
            wallet = new UserWallet
            {
                UserId = userId,
                Balance = 0
            };
            await _walletRepository.AddAsync(wallet);
        }

        var signedAmount = type == "withdrawal"
            ? -Math.Abs(request.Amount)
            : Math.Abs(request.Amount);

        var newBalance = wallet.Balance + signedAmount;
        if (newBalance < 0)
        {
            throw new InvalidOperationException("Insufficient balance");
        }

        var now = DateTime.UtcNow;

        var transaction = new UserTransaction
        {
            UserId = userId,
            Type = type,
            Gateway = request.Gateway,
            Amount = request.Amount,
            TransactionDate = now
        };

        await _transactionRepository.AddAsync(transaction);

        wallet.Balance = newBalance;
        await _walletRepository.UpdateAsync(wallet);

        var dto = new UserTransactionDto
        {
            Gateway = transaction.Gateway,
            Type = transaction.Type,
            Amount = transaction.Amount,
            Date = transaction.TransactionDate
        };

        return new AddUserTransactionResponse
        {
            Message = "Transaction added successfully",
            Transaction = dto,
            NewBalance = newBalance
        };
    }

    public async Task<IReadOnlyList<UserTransactionDto>> GetUserTransactionsAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("User id is required", nameof(userId));
        }

        var user = await _userRepository.GetByIdAsync(userId)
                   ?? throw new InvalidOperationException("User not found");

        var transactions = await _transactionRepository.GetByUserIdAsync(userId);

        return transactions
            .OrderByDescending(t => t.TransactionDate)
            .Select(t => new UserTransactionDto
            {
                Gateway = t.Gateway,
                Type = t.Type,
                Amount = t.Amount,
                Date = t.TransactionDate
            })
            .ToList();
    }

    public async Task<decimal> GetUserBalanceAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("User id is required", nameof(userId));
        }

        var user = await _userRepository.GetByIdAsync(userId)
                   ?? throw new InvalidOperationException("User not found");

        var wallet = await _walletRepository.GetByUserIdAsync(userId);
        return wallet?.Balance ?? 0m;
    }
}
