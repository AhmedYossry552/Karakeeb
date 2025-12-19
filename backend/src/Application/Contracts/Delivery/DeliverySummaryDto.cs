namespace Recycling.Application.Contracts.Delivery;

public class DeliverySummaryDto
{
    public string Id { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? PhoneNumber { get; set; }
    public bool IsApproved { get; set; }

    public string? LicenseNumber { get; set; }
    public string? VehicleType { get; set; }
    public string? NationalId { get; set; }
    public string? EmergencyContact { get; set; }
    public string? DeliveryImage { get; set; }
    public string? VehicleImage { get; set; }
    public string? CriminalRecord { get; set; }
    public string? Status { get; set; }
}
