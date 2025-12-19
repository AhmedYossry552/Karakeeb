namespace Recycling.Application.Contracts.Cart;

public class UpdateCartItemRequest
{
    public int CartItemId { get; set; }
    public decimal Quantity { get; set; }
}
