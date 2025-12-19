using System;

namespace Recycling.Application.Contracts.Wallet;

public class UserTransactionDto
{
    public string? Gateway { get; set; }
    public string Type { get; set; } = null!;
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
}
