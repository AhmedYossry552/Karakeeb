namespace Recycling.Application.Contracts.Orders;

public class UpdateOrderStatusRequest
{
    public string Status { get; set; } = null!;
    public string? Reason { get; set; }
    public string? Notes { get; set; }
}
