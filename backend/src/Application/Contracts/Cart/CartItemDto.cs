namespace Recycling.Application.Contracts.Cart;

public class CartItemDto
{
    public int Id { get; set; }
    public string ItemId { get; set; } = null!;
    public string NameEn { get; set; } = null!;
    public string NameAr { get; set; } = null!;
    public string CategoryNameEn { get; set; } = null!;
    public string CategoryNameAr { get; set; } = null!;
    public string? Image { get; set; }
    public int Points { get; set; }
    public decimal Price { get; set; }
    public int MeasurementUnit { get; set; }
    public decimal Quantity { get; set; }
    public decimal TotalPrice { get; set; }
    public int TotalPoints { get; set; }
}
