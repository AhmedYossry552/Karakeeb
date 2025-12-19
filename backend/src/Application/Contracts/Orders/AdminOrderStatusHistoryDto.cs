using System;

namespace Recycling.Application.Contracts.Orders;

public class AdminOrderStatusHistoryDto
{
    public string Status { get; set; } = null!;
    public DateTime Timestamp { get; set; }
    public string? UpdatedBy { get; set; }
    public string? Notes { get; set; }
}
