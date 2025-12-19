using System.Collections.Generic;

namespace Recycling.Application.Contracts.Cart;

public class SaveCartRequest
{
    public string? UserId { get; set; }

    public List<SaveCartItemRequest> Items { get; set; } = new();
}
