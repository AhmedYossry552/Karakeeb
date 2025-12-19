using System.Text.Json.Serialization;

namespace Recycling.Application.Contracts.Auth;

public class GoogleProviderResponse
{
    public bool Exists { get; set; }
    public GoogleUserInfoDto User { get; set; } = new GoogleUserInfoDto();
    public string? AccessToken { get; set; }

    [JsonIgnore]
    public string? RefreshToken { get; set; }
}
