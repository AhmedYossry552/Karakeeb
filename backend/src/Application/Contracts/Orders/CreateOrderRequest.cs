namespace Recycling.Application.Contracts.Orders;

public class CreateOrderRequest
{
    public string? AddressId { get; set; }
    public string? PaymentMethod { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal? EstimatedWeight { get; set; }
    public string? QuantityAdjustmentNotes { get; set; }
}
