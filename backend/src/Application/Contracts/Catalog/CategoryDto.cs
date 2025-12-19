namespace Recycling.Application.Contracts.Catalog;

public class CategoryDto
{
    public string Id { get; set; } = null!;
    public string NameEn { get; set; } = null!;
    public string NameAr { get; set; } = null!;
    public string? DescriptionEn { get; set; }
    public string? DescriptionAr { get; set; }
    public string? Image { get; set; }
}
