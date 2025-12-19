using System;

namespace Recycling.Domain.Entities;

public class UserTransaction
{
    public int Id { get; set; }
    public string UserId { get; set; } = null!;
    public string Type { get; set; } = null!; // "cashback" or "withdrawal"
    public string? Gateway { get; set; }
    public decimal Amount { get; set; }
    public DateTime TransactionDate { get; set; }

    public User User { get; set; } = null!;
}
