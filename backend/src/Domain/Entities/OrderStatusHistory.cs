using System;

namespace Recycling.Domain.Entities;

public class OrderStatusHistory
{
    public int Id { get; set; }
    public string OrderId { get; set; } = null!;
    public string Status { get; set; } = null!;
    public DateTime Timestamp { get; set; }
    public string? UpdatedBy { get; set; }
    public string? Notes { get; set; }

    public Order Order { get; set; } = null!;
}
