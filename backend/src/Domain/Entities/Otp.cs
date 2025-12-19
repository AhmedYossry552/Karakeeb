using System;

namespace Recycling.Domain.Entities;

public class Otp
{
    public string Id { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Code { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
