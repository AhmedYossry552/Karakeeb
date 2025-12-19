using System.Collections.Generic;

namespace Recycling.Application.Contracts.Cart;

public class CartDto
{
    public string Id { get; set; } = null!;
    public IReadOnlyList<CartItemDto> Items { get; set; } = new List<CartItemDto>();
    public decimal TotalAmount { get; set; }
    public int TotalPoints { get; set; }
}
