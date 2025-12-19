using System;

namespace Recycling.Domain.Entities;

public class UserWallet
{
    public string UserId { get; set; } = null!;
    public decimal Balance { get; set; }

    public User User { get; set; } = null!;
}
