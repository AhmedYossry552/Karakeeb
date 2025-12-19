using System;
using System.Text.Json.Serialization;

namespace Recycling.Application.Contracts.Auth;

public class AuthResponse
{
    public string Id { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string Token { get; set; } = null!;
    public string? PhoneNumber { get; set; }
    public string? Provider { get; set; }
    public bool IsApproved { get; set; }
    public string? ImgUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastActiveAt { get; set; }

    [JsonIgnore]
    public string? RefreshToken { get; set; }
}
