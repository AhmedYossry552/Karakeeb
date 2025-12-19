namespace Recycling.Application.Contracts.Auth;

public class RegisterDeliveryRequest
{
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string? PhoneNumber { get; set; }
    public string? Provider { get; set; }

    public string LicenseNumber { get; set; } = null!;
    public string VehicleType { get; set; } = null!;
    public string? NationalId { get; set; }
    public string? EmergencyContact { get; set; }

    public string? DeliveryImage { get; set; }
    public string? VehicleImage { get; set; }
    public string? CriminalRecord { get; set; }
}
