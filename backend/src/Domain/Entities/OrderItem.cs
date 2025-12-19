using System;

namespace Recycling.Domain.Entities;

public class OrderItem
{
    public int Id { get; set; }
    public string OrderId { get; set; } = null!;
    public string? ItemId { get; set; }
    public string? CategoryId { get; set; }
    public string NameEn { get; set; } = null!;
    public string NameAr { get; set; } = null!;
    public string CategoryNameEn { get; set; } = null!;
    public string CategoryNameAr { get; set; } = null!;
    public string? Image { get; set; }
    public int MeasurementUnit { get; set; }
    public int Points { get; set; }
    public decimal Price { get; set; }
    public decimal Quantity { get; set; }
    public decimal? OriginalQuantity { get; set; }
    public bool QuantityAdjusted { get; set; }
    public string? Unit { get; set; }

    public Order Order { get; set; } = null!;
}
