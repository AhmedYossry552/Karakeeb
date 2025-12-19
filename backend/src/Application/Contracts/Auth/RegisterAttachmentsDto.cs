namespace Recycling.Application.Contracts.Auth;

public class RegisterAttachmentsDto
{
    public string? BusinessName { get; set; }
    public string? BusinessType { get; set; }
    public string? BusinessAddress { get; set; }
    public string? BusinessLicense { get; set; }
    public string? TaxId { get; set; }
    public string? EstimatedMonthlyVolume { get; set; }
    public string? Notes { get; set; }
}
