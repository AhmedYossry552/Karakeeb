using System;
using System.Collections.Generic;

namespace Recycling.Application.Contracts.Orders;

public class OrderDto
{
    public string Id { get; set; } = null!;
    public string? AddressId { get; set; }
    public string Status { get; set; } = null!;
    public string? PaymentMethod { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public IReadOnlyList<OrderItemDto> Items { get; set; } = new List<OrderItemDto>();
}
