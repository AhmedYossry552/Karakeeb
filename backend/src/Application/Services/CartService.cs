using System;
using System.Linq;
using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Cart;
using Recycling.Domain.Entities;

namespace Recycling.Application.Services;

public class CartService : ICartService
{
    private readonly ICartRepository _cartRepository;
    private readonly IItemRepository _itemRepository;
    private readonly ICategoryRepository _categoryRepository;

    public CartService(
        ICartRepository cartRepository,
        IItemRepository itemRepository,
        ICategoryRepository categoryRepository)
    {
        _cartRepository = cartRepository;
        _itemRepository = itemRepository;
        _categoryRepository = categoryRepository;
    }

    public async Task<CartDto> GetCartAsync(string userId)
    {
        var cart = await _cartRepository.GetByUserIdAsync(userId);
        return cart is null ? EmptyCartDto() : MapCart(cart);
    }

    public async Task<CartDto> AddItemAsync(string userId, AddCartItemRequest request)
    {
        if (request.Quantity <= 0)
        {
            throw new ArgumentException("Quantity must be greater than zero", nameof(request.Quantity));
        }

        var cart = await _cartRepository.GetByUserIdAsync(userId);
        var isNew = cart is null;
        var now = DateTime.UtcNow;

        if (cart is null)
        {
            cart = new Cart
            {
                Id = Guid.NewGuid().ToString(),
                UserId = userId,
                CreatedAt = now,
                UpdatedAt = now
            };
        }

        var existingItem = cart.Items.FirstOrDefault(i => i.ItemId == request.ItemId);
        if (existingItem != null)
        {
            existingItem.Quantity += request.Quantity;
        }
        else
        {
            var item = await _itemRepository.GetByIdAsync(request.ItemId)
                       ?? throw new InvalidOperationException("Item not found");

            var category = await _categoryRepository.GetByIdAsync(item.CategoryId)
                           ?? throw new InvalidOperationException("Category not found");

            cart.Items.Add(new CartItem
            {
                ItemId = item.Id,
                NameEn = item.NameEn,
                NameAr = item.NameAr,
                CategoryNameEn = category.NameEn,
                CategoryNameAr = category.NameAr,
                Image = item.Image,
                Points = item.Points,
                Price = item.Price,
                MeasurementUnit = item.MeasurementUnit,
                Quantity = request.Quantity
            });
        }

        cart.UpdatedAt = now;

        if (isNew)
        {
            await _cartRepository.AddAsync(cart);
        }
        else
        {
            await _cartRepository.UpdateAsync(cart);
        }

        return MapCart(cart);
    }

    public async Task<CartDto> UpdateItemAsync(string userId, UpdateCartItemRequest request)
    {
        var cart = await _cartRepository.GetByUserIdAsync(userId)
                   ?? throw new InvalidOperationException("Cart not found");

        var item = cart.Items.FirstOrDefault(i => i.Id == request.CartItemId)
                   ?? throw new InvalidOperationException("Cart item not found");

        if (request.Quantity <= 0)
        {
            cart.Items.Remove(item);
        }
        else
        {
            item.Quantity = request.Quantity;
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _cartRepository.UpdateAsync(cart);

        return MapCart(cart);
    }

    public async Task<CartDto> RemoveItemAsync(string userId, int cartItemId)
    {
        var cart = await _cartRepository.GetByUserIdAsync(userId)
                   ?? throw new InvalidOperationException("Cart not found");

        var item = cart.Items.FirstOrDefault(i => i.Id == cartItemId);
        if (item != null)
        {
            cart.Items.Remove(item);
            cart.UpdatedAt = DateTime.UtcNow;
            await _cartRepository.UpdateAsync(cart);
        }

        return MapCart(cart);
    }

    public async Task ClearCartAsync(string userId)
    {
        var cart = await _cartRepository.GetByUserIdAsync(userId);
        if (cart is null)
        {
            return;
        }

        cart.Items.Clear();
        cart.UpdatedAt = DateTime.UtcNow;
        await _cartRepository.UpdateAsync(cart);
    }

    public async Task SaveCartAsync(string userId, SaveCartRequest request)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("UserId is required", nameof(userId));
        }

        var now = DateTime.UtcNow;
        var cart = await _cartRepository.GetByUserIdAsync(userId);
        var isNew = cart is null;

        if (cart is null)
        {
            cart = new Cart
            {
                Id = Guid.NewGuid().ToString(),
                UserId = userId,
                CreatedAt = now,
                UpdatedAt = now
            };
        }
        else
        {
            // Clear existing items explicitly before adding new ones
            await _cartRepository.ClearAsync(cart);
            cart.UpdatedAt = now;
        }

        if (request.Items != null && request.Items.Count > 0)
        {
            foreach (var item in request.Items)
            {
                if (item == null || string.IsNullOrWhiteSpace(item.ItemId))
                {
                    continue;
                }

                if (item.Quantity <= 0)
                {
                    continue;
                }

                var cartItem = new CartItem
                {
                    ItemId = item.ItemId,
                    NameEn = item.Name?.En ?? string.Empty,
                    NameAr = item.Name?.Ar ?? item.Name?.En ?? string.Empty,
                    CategoryNameEn = item.CategoryName?.En ?? string.Empty,
                    CategoryNameAr = item.CategoryName?.Ar ?? item.CategoryName?.En ?? string.Empty,
                    Image = item.Image,
                    Points = item.Points,
                    Price = item.Price,
                    MeasurementUnit = item.MeasurementUnit,
                    Quantity = item.Quantity
                };

                cart.Items.Add(cartItem);
            }
        }

        if (isNew)
        {
            await _cartRepository.AddAsync(cart);
        }
        else
        {
            await _cartRepository.UpdateAsync(cart);
        }
    }

    private static CartDto EmptyCartDto() => new()
    {
        Id = string.Empty,
        Items = Array.Empty<CartItemDto>(),
        TotalAmount = 0,
        TotalPoints = 0
    };

    private static CartDto MapCart(Cart cart)
    {
        var items = cart.Items.Select(i => new CartItemDto
        {
            Id = i.Id,
            ItemId = i.ItemId,
            NameEn = i.NameEn,
            NameAr = i.NameAr,
            CategoryNameEn = i.CategoryNameEn,
            CategoryNameAr = i.CategoryNameAr,
            Image = i.Image,
            Points = i.Points,
            Price = i.Price,
            MeasurementUnit = i.MeasurementUnit,
            Quantity = i.Quantity,
            TotalPrice = i.Price * i.Quantity,
            TotalPoints = i.Points * (int)i.Quantity
        }).ToList();

        var totalAmount = items.Sum(i => i.TotalPrice);
        var totalPoints = items.Sum(i => i.TotalPoints);

        return new CartDto
        {
            Id = cart.Id,
            Items = items,
            TotalAmount = totalAmount,
            TotalPoints = totalPoints
        };
    }
}
