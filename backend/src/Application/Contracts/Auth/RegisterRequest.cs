namespace Recycling.Application.Contracts.Auth;

public class RegisterRequest
{
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Password { get; set; }
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = "customer";
    public RegisterAttachmentsDto? Attachments { get; set; }
    public string? Provider { get; set; }
    public string? ImgUrl { get; set; }
    public string? IdToken { get; set; }
    public string? OtpCode { get; set; }
}
