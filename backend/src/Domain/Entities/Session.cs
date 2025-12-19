using System;

namespace Recycling.Domain.Entities;

public class Session
{
    public string Id { get; set; } = null!;
    public string? UserId { get; set; }
    public string SessionId { get; set; } = null!;
    public string? Device { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public bool IsValid { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
}
