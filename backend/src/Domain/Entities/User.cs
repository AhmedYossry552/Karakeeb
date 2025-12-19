using System;

namespace Recycling.Domain.Entities;

public class User
{
    public string Id { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Password { get; set; }
    public string? PhoneNumber { get; set; }
    public string? Provider { get; set; }
    public string Role { get; set; } = null!;
    public string? StripeCustomerId { get; set; }
    public decimal TotalPoints { get; set; }
    public bool IsApproved { get; set; }
    public string? ImgUrl { get; set; }
    public decimal? Rating { get; set; }
    public int TotalReviews { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? LastActiveAt { get; set; }
    public int VoiceUsageCount { get; set; }
    public int? VoiceUsageLimit { get; set; }
    public DateTime? LastVoiceUsageReset { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
