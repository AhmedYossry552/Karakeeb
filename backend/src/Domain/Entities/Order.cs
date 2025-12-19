using System;
using System.Collections.Generic;

namespace Recycling.Domain.Entities;

public class Order
{
    public string Id { get; set; } = null!;
    public string UserId { get; set; } = null!;
    public string? AddressId { get; set; }
    public string? CourierId { get; set; }
    public string Status { get; set; } = null!;
    public string? PaymentMethod { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal TotalAmount { get; set; }
    public bool HasQuantityAdjustments { get; set; }
    public string? QuantityAdjustmentNotes { get; set; }
    public decimal? EstimatedWeight { get; set; }
    public DateTime? CollectedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    public ICollection<OrderStatusHistory> StatusHistory { get; set; } = new List<OrderStatusHistory>();
    public ICollection<OrderDeliveryProof> DeliveryProofs { get; set; } = new List<OrderDeliveryProof>();
}
