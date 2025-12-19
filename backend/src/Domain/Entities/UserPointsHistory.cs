using System;

namespace Recycling.Domain.Entities;

public class UserPointsHistory
{
    public int Id { get; set; }
    public string UserId { get; set; } = null!;
    public string? OrderId { get; set; }
    public int Points { get; set; }
    public string Type { get; set; } = null!; // earned, deducted
    public string Reason { get; set; } = null!;
    public DateTime Timestamp { get; set; }
}
