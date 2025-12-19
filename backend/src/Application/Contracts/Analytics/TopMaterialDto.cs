namespace Recycling.Application.Contracts.Analytics;

public class TopMaterialDto
{
    public string NameEn { get; set; } = null!;
    public string NameAr { get; set; } = null!;
    public decimal TotalQuantity { get; set; }
    public decimal TotalPoints { get; set; }
    public string? Image { get; set; }
    public string? CategoryNameEn { get; set; }
    public string? CategoryNameAr { get; set; }
    public string Unit { get; set; } = null!;
    public int OrderCount { get; set; }
}
