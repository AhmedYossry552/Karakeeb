using System;

namespace Recycling.Application.Contracts.Addresses;

public class AddressDto
{
    public string Id { get; set; } = null!;
    public string City { get; set; } = null!;
    public string Area { get; set; } = null!;
    public string Street { get; set; } = null!;
    public string? Building { get; set; }
    public string? Floor { get; set; }
    public string? Apartment { get; set; }
    public string? Landmark { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
