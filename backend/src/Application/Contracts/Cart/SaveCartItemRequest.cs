using System.Text.Json.Serialization;

namespace Recycling.Application.Contracts.Cart;

public class SaveCartItemRequest
{
    [JsonPropertyName("_id")]
    public string ItemId { get; set; } = null!;

    public string? CategoryId { get; set; }

    public BilingualText? Name { get; set; }

    public BilingualText? CategoryName { get; set; }

    public string? Image { get; set; }

    public int Points { get; set; }

    public decimal Price { get; set; }

    [JsonPropertyName("measurement_unit")]
    public int MeasurementUnit { get; set; }

    public decimal Quantity { get; set; }
}
