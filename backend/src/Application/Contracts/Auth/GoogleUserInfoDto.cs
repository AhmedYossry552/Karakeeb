namespace Recycling.Application.Contracts.Auth;

public class GoogleUserInfoDto
{
    public string? Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Image { get; set; }
    public string Role { get; set; } = "customer";
    public string Provider { get; set; } = "google";
    public bool IsApproved { get; set; }
}
