namespace Recycling.Application.Contracts.Cart;

public class AddCartItemRequest
{
    public string ItemId { get; set; } = null!;
    public decimal Quantity { get; set; }
}
