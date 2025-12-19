using System.Security.Claims;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api")]
public class CourierController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IOrderRepository _orderRepository;
    private readonly IUserRepository _userRepository;
    private readonly IAddressRepository _addressRepository;

    public CourierController(
        IOrderService orderService,
        IOrderRepository orderRepository,
        IUserRepository userRepository,
        IAddressRepository addressRepository)
    {
        _orderService = orderService;
        _orderRepository = orderRepository;
        _userRepository = userRepository;
        _addressRepository = addressRepository;
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

    // GET /api/my-orders
    [HttpGet("my-orders")]
    [Authorize(Roles = "delivery")]
    public async Task<IActionResult> GetMyOrders()
    {
        var courierId = GetUserId();

        var orders = await _orderRepository.GetByCourierIdAndStatusAsync(courierId, "assigntocourier");

        var userIds = orders
            .Select(o => o.UserId)
            .Distinct()
            .ToList();

        var users = await _userRepository.GetByIdsAsync(userIds);
        var userLookup = users.ToDictionary(u => u.Id, u => u);

        var addressIds = orders
            .Where(o => !string.IsNullOrWhiteSpace(o.AddressId))
            .Select(o => o.AddressId!)
            .Distinct()
            .ToList();

        var addressLookup = new Dictionary<string, Address>();
        foreach (var addressId in addressIds)
        {
            var address = await _addressRepository.GetByIdAsync(addressId);
            if (address != null)
            {
                addressLookup[address.Id] = address;
            }
        }

        var data = orders.Select(o =>
        {
            userLookup.TryGetValue(o.UserId, out var user);

            Address? address = null;
            if (!string.IsNullOrWhiteSpace(o.AddressId))
            {
                addressLookup.TryGetValue(o.AddressId, out address);
            }

            var items = o.Items.Select(i => new
            {
                _id = i.Id,
                name = new
                {
                    en = i.NameEn,
                    ar = i.NameAr
                },
                categoryName = new
                {
                    en = i.CategoryNameEn,
                    ar = i.CategoryNameAr
                },
                image = i.Image,
                points = i.Points,
                price = i.Price,
                measurement_unit = i.MeasurementUnit,
                quantity = i.Quantity,
                itemName = i.NameEn,
                totalPoints = i.Points * i.Quantity,
                originalQuantity = (decimal?)null,
                description = (string?)null
            }).ToList();

            var userObject = user == null
                ? null
                : new
                {
                    userId = user.Id,
                    phoneNumber = user.PhoneNumber,
                    userName = user.Name,
                    email = user.Email,
                    image = user.ImgUrl,
                    role = user.Role
                };

            var addressObject = address == null
                ? null
                : new
                {
                    city = address.City,
                    area = address.Area,
                    street = address.Street,
                    building = address.Building ?? string.Empty,
                    floor = address.Floor ?? string.Empty,
                    apartment = address.Apartment ?? string.Empty,
                    landmark = address.Landmark ?? string.Empty,
                    notes = address.Notes ?? string.Empty
                };

            return new
            {
                _id = o.Id,
                status = o.Status,
                createdAt = o.CreatedAt,
                user = userObject,
                address = addressObject,
                items,
                deliveryFee = o.DeliveryFee,
                paymentMethod = o.PaymentMethod,
                totalAmount = o.TotalAmount
            };
        }).ToList();

        return Ok(new { orders = data });
    }

    // GET /api/orders/courier/{courierId}
    // Admin endpoint to list all orders assigned to a specific courier.
    [HttpGet("orders/courier/{courierId}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetOrdersByCourier(string courierId)
    {
        if (string.IsNullOrWhiteSpace(courierId))
        {
            return BadRequest(new { message = "Courier ID is required" });
        }

        var orders = await _orderRepository.GetByCourierIdAsync(courierId);

        var userIds = orders
            .Select(o => o.UserId)
            .Distinct()
            .ToList();

        var users = await _userRepository.GetByIdsAsync(userIds);
        var userLookup = users.ToDictionary(u => u.Id, u => u);

        var addressIds = orders
            .Where(o => !string.IsNullOrWhiteSpace(o.AddressId))
            .Select(o => o.AddressId!)
            .Distinct()
            .ToList();

        var addressLookup = new Dictionary<string, Address>();
        foreach (var addressId in addressIds)
        {
            var address = await _addressRepository.GetByIdAsync(addressId);
            if (address != null)
            {
                addressLookup[address.Id] = address;
            }
        }

        var data = orders.Select(o =>
        {
            userLookup.TryGetValue(o.UserId, out var user);

            Address? address = null;
            if (!string.IsNullOrWhiteSpace(o.AddressId))
            {
                addressLookup.TryGetValue(o.AddressId, out address);
            }

            var items = o.Items.Select(i => new
            {
                _id = i.Id,
                name = new
                {
                    en = i.NameEn,
                    ar = i.NameAr
                },
                categoryName = new
                {
                    en = i.CategoryNameEn,
                    ar = i.CategoryNameAr
                },
                image = i.Image,
                points = i.Points,
                price = i.Price,
                measurement_unit = i.MeasurementUnit,
                quantity = i.Quantity,
                itemName = i.NameEn,
                totalPoints = i.Points * i.Quantity,
                originalQuantity = (decimal?)null,
                description = (string?)null
            }).ToList();

            var userObject = user == null
                ? null
                : new
                {
                    userId = user.Id,
                    phoneNumber = user.PhoneNumber,
                    userName = user.Name,
                    email = user.Email,
                    image = user.ImgUrl,
                    role = user.Role
                };

            var addressObject = address == null
                ? null
                : new
                {
                    city = address.City,
                    area = address.Area,
                    street = address.Street,
                    building = address.Building ?? string.Empty,
                    floor = address.Floor ?? string.Empty,
                    apartment = address.Apartment ?? string.Empty,
                    landmark = address.Landmark ?? string.Empty,
                    notes = address.Notes ?? string.Empty
                };

            return new
            {
                _id = o.Id,
                status = o.Status,
                createdAt = o.CreatedAt,
                user = userObject,
                address = addressObject,
                items,
                deliveryFee = o.DeliveryFee,
                paymentMethod = o.PaymentMethod,
                totalAmount = o.TotalAmount
            };
        }).ToList();

        return Ok(data);
    }
}
