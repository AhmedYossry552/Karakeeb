using System.Text.Json.Serialization;

namespace Recycling.Application.Contracts.Cart;

public class BilingualText
{
    [JsonPropertyName("en")]
    public string? En { get; set; }

    [JsonPropertyName("ar")]
    public string? Ar { get; set; }
}
