using System;

namespace Recycling.Domain.Entities;

public class OrderReview
{
    public int Id { get; set; }
    public string OrderId { get; set; } = null!;
    public string UserId { get; set; } = null!;
    public string? CourierId { get; set; }
    public int Stars { get; set; }
    public string? Comment { get; set; }
    public DateTime ReviewedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Order Order { get; set; } = null!;
}
