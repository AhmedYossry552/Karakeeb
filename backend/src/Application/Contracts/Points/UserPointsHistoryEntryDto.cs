using System;

namespace Recycling.Application.Contracts.Points;

public class UserPointsHistoryEntryDto
{
    public string? OrderId { get; set; }
    public int Points { get; set; }
    public string Type { get; set; } = null!;
    public string Reason { get; set; } = null!;
    public DateTime Timestamp { get; set; }
}
