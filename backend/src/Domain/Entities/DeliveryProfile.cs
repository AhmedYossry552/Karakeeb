using System;

namespace Recycling.Domain.Entities;

public class DeliveryProfile
{
    public string UserId { get; set; } = null!;
    public string? LicenseNumber { get; set; }
    public string? VehicleType { get; set; }
    public string? NationalId { get; set; }
    public string? EmergencyContact { get; set; }
    public string? DeliveryImage { get; set; }
    public string? VehicleImage { get; set; }
    public string? CriminalRecord { get; set; }
    public string? Status { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? RevokeReason { get; set; }

    public User User { get; set; } = null!;
}
