using System;
using System.Collections.Generic;

namespace Recycling.Domain.Entities;

public class Cart
{
    public string Id { get; set; } = null!;
    public string? UserId { get; set; }
    public string? SessionId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
}
