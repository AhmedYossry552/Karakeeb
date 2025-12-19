using System;

namespace Recycling.Domain.Entities;

public class OrderDeliveryProof
{
    public int Id { get; set; }
    public string OrderId { get; set; } = null!;
    public string PhotoPath { get; set; } = null!;
    public string PhotoUrl { get; set; } = null!;
    public DateTime UploadedAt { get; set; }
    public string? Notes { get; set; }
    public string CompletedBy { get; set; } = null!;

    public Order Order { get; set; } = null!;
}
