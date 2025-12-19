namespace Recycling.Application.Contracts.Orders;

public class OrderItemDto
{
    public int Id { get; set; }
    public string? ItemId { get; set; }
    public string NameEn { get; set; } = null!;
    public string NameAr { get; set; } = null!;
    public string CategoryNameEn { get; set; } = null!;
    public string CategoryNameAr { get; set; } = null!;
    public string? Image { get; set; }
    public int MeasurementUnit { get; set; }
    public int Points { get; set; }
    public decimal Price { get; set; }
    public decimal Quantity { get; set; }
}
