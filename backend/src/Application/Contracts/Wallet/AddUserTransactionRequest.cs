using System;

namespace Recycling.Application.Contracts.Wallet;

public class AddUserTransactionRequest
{
    public string? Gateway { get; set; }
    public string? Type { get; set; } // "cashback" or "withdrawal" (default "withdrawal" if null)
    public decimal Amount { get; set; }
}
