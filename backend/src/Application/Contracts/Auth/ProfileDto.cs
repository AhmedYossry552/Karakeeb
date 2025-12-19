namespace Recycling.Application.Contracts.Auth;

public class ProfileDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = string.Empty;
    public string? ImgUrl { get; set; }

    // Buyer profile
    public string? BusinessName { get; set; }
    public string? BusinessType { get; set; }
    public string? BusinessAddress { get; set; }
    public string? BusinessLicense { get; set; }
    public string? TaxId { get; set; }
    public string? EstimatedMonthlyVolume { get; set; }

    // Delivery profile
    public string? LicenseNumber { get; set; }
    public string? VehicleType { get; set; }
    public string? NationalId { get; set; }
    public string? EmergencyContact { get; set; }
    public string? DeliveryImage { get; set; }
    public string? VehicleImage { get; set; }
    public string? CriminalRecord { get; set; }
    public string? DeliveryStatus { get; set; }
}
