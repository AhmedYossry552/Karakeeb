namespace Recycling.Application.Contracts.Catalog;

public class ItemDto
{
    public string Id { get; set; } = null!;
    public string CategoryId { get; set; } = null!;
    public string NameEn { get; set; } = null!;
    public string NameAr { get; set; } = null!;
    public int Points { get; set; }
    public decimal Price { get; set; }
    public int MeasurementUnit { get; set; }
    public string? Image { get; set; }
    public decimal Quantity { get; set; }
}
