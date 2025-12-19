using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Cart;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/cart")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly ICartService _cartService;

    public CartController(ICartService cartService)
    {
        _cartService = cartService;
    }

    private string GetUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            throw new UnauthorizedAccessException("User id not found in token");
        }

        return userId;
    }

    [HttpGet]
    public async Task<IActionResult> GetCart()
    {
        var userId = GetUserId();
        var cart = await _cartService.GetCartAsync(userId);

        var items = cart.Items.Select(i => new
        {
            _id = i.ItemId,
            id = i.Id, // CartItemId for update/delete operations
            cartItemId = i.Id, // Alias for clarity
            categoryId = i.ItemId,
            name = new { en = i.NameEn, ar = i.NameAr },
            categoryName = new { en = i.CategoryNameEn, ar = i.CategoryNameAr },
            image = i.Image,
            points = i.Points,
            price = i.Price,
            measurement_unit = i.MeasurementUnit,
            quantity = i.Quantity
        });

        return Ok(new { items });
    }

    [HttpPost]
    public async Task<IActionResult> AddItem([FromBody] AddCartItemRequest request)
    {
        var userId = GetUserId();
        var cart = await _cartService.AddItemAsync(userId, request);
        return Ok(cart);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateItem([FromBody] UpdateCartItemRequest request)
    {
        var userId = GetUserId();
        var cart = await _cartService.UpdateItemAsync(userId, request);
        return Ok(cart);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> RemoveItem(int id)
    {
        var userId = GetUserId();
        var cart = await _cartService.RemoveItemAsync(userId, id);
        return Ok(cart);
    }

    [HttpDelete]
    public async Task<IActionResult> ClearCart()
    {
        var userId = GetUserId();
        await _cartService.ClearCartAsync(userId);
        return NoContent();
    }

    [HttpPost("save")]
    public async Task<IActionResult> SaveCart([FromBody] SaveCartRequest request)
    {
        var userId = GetUserId();
        await _cartService.SaveCartAsync(userId, request);
        return Ok(new { message = "Cart saved successfully" });
    }
}
