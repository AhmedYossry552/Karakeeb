namespace Recycling.Domain.Entities;

public class BuyerProfile
{
    public string UserId { get; set; } = null!;
    public string BusinessName { get; set; } = null!;
    public string? BusinessType { get; set; }
    public string? BusinessAddress { get; set; }
    public string? BusinessLicense { get; set; }
    public string? TaxId { get; set; }
    public string? EstimatedMonthlyVolume { get; set; }

    public User User { get; set; } = null!;
}
