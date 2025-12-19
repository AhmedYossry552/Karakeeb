namespace Recycling.Application.Contracts.Orders;

public class CancelOrderRequest
{
    public string? Reason { get; set; }
    public string? Notes { get; set; }
}
