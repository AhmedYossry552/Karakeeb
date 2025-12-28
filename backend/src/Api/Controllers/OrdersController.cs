using System.Linq;
using System.Security.Claims;
using System.Text.Json.Serialization;
using System.IO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Addresses;
using Recycling.Application.Contracts.Orders;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
        private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
        };

        private const long MaxProofImageBytes = 5 * 1024 * 1024; // 5 MB
    private readonly IOrderService _orderService;
    private readonly IPointsService _pointsService;
    private readonly IAddressService _addressService;
    private readonly IImageUploadService _imageUploadService;

    public OrdersController(
        IOrderService orderService,
        IPointsService pointsService,
        IAddressService addressService,
        IImageUploadService imageUploadService)
    {
        _orderService = orderService;
        _pointsService = pointsService;
        _addressService = addressService;
        _imageUploadService = imageUploadService;
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
    public async Task<IActionResult> GetUserOrders([FromQuery] int page = 1, [FromQuery] int limit = 10, [FromQuery] string? status = null)
    {
        var userId = GetUserId();
        var result = await _orderService.GetUserOrdersPagedAsync(userId, page, limit, status);

        // Process orders sequentially to avoid DbContext concurrency issues
        var nodeOrders = new List<object>();
        foreach (var order in result.Data)
        {
            var nodeOrder = await MapToNodeOrderAsync(order, userId);
            nodeOrders.Add(nodeOrder);
        }

        var pagination = result.Pagination;

        return Ok(new
        {
            success = true,
            count = nodeOrders.Count,
            totalCount = pagination.TotalItems,
            totalCompletedOrders = result.TotalCompletedOrders,
            data = nodeOrders,
            pagination = new
            {
                currentPage = pagination.CurrentPage,
                totalPages = pagination.TotalPages,
                hasNextPage = pagination.HasNextPage,
                hasPrevPage = pagination.CurrentPage > 1,
                limit = pagination.ItemsPerPage,
                // Helpful for some dashboard code paths
                totalOrders = pagination.TotalItems
            }
        });
    }

    // GET /api/orders/points
    [HttpGet("points")]
    public async Task<IActionResult> GetUserOrdersWithPoints()
    {
        var userId = GetUserId();
        var ordersWithPoints = await _pointsService.GetUserOrdersWithPointsAsync(userId);
        return Ok(ordersWithPoints);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderApiRequest request)
    {
        var userId = GetUserId();

        string? addressId = null;

        if (!string.IsNullOrWhiteSpace(request.AddressId))
        {
            addressId = request.AddressId;
        }
        else if (!string.IsNullOrWhiteSpace(request.Address?.Id))
        {
            addressId = request.Address!.Id;
        }
        else if (request.Address is { } addr &&
                 !string.IsNullOrWhiteSpace(addr.City) &&
                 !string.IsNullOrWhiteSpace(addr.Area) &&
                 !string.IsNullOrWhiteSpace(addr.Street))
        {
            var createAddressRequest = new CreateAddressRequest
            {
                City = addr.City!,
                Area = addr.Area!,
                Street = addr.Street!,
                Building = addr.Building,
                Floor = addr.Floor,
                Apartment = addr.Apartment,
                Landmark = addr.Landmark,
                Notes = addr.Notes
            };

            var createdAddress = await _addressService.CreateAddressAsync(userId, createAddressRequest);
            addressId = createdAddress.Id;
        }

        var serviceRequest = new CreateOrderRequest
        {
            AddressId = addressId,
            PaymentMethod = request.PaymentMethod,
            DeliveryFee = request.DeliveryFee
        };

        var order = await _orderService.CreateOrderFromCartAsync(userId, serviceRequest);

        var nodeOrder = await MapToNodeOrderAsync(order, userId);

        return StatusCode(StatusCodes.Status201Created, new
        {
            success = true,
            message = "Order created successfully",
            data = nodeOrder
        });
    }

    public class CompleteOrderWithProofRequest
    {
        public string? Notes { get; set; }
        public string? QuantityNotes { get; set; }
        public string? UpdatedQuantities { get; set; }
        public IFormFile? ProofPhoto { get; set; }
    }

    public class CreateOrderAddressRequest
    {
        [JsonPropertyName("_id")]
        public string? Id { get; set; }
        public string? City { get; set; }
        public string? Area { get; set; }
        public string? Street { get; set; }
        public string? Building { get; set; }
        public string? Floor { get; set; }
        public string? Apartment { get; set; }
        public string? Landmark { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateOrderApiRequest
    {
        public string? AddressId { get; set; }
        public CreateOrderAddressRequest? Address { get; set; }
        public decimal DeliveryFee { get; set; }
        public string? PaymentMethod { get; set; }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrderById(string id)
    {
        var userId = GetUserId();
        var order = await _orderService.GetOrderByIdAsync(userId, id);
        if (order is null)
        {
            return NotFound();
        }

        var nodeOrder = await MapToNodeOrderAsync(order, userId);

        return Ok(new
        {
            success = true,
            data = nodeOrder
        });
    }

    // GET /api/orders/status/{status}
    [HttpGet("status/{status}")]
    public async Task<IActionResult> GetByStatus(string status)
    {
        var userId = GetUserId();
        var orders = await _orderService.GetUserOrdersByStatusAsync(userId, status);
        return Ok(orders);
    }

    // PUT /api/orders/{id}/status
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(string id, [FromBody] UpdateOrderStatusRequest request)
    {
        var userId = GetUserId();
        var success = await _orderService.UpdateOrderStatusAsync(userId, id, request.Status, request.Reason, request.Notes);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    // PUT /api/orders/{orderId}/auto-assign-courier
    [HttpPut("{orderId}/auto-assign-courier")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AutoAssignCourier(string orderId)
    {
        var success = await _orderService.AutoAssignCourierAsync(orderId);
        if (!success)
        {
            return BadRequest("No suitable courier found or order address is missing.");
        }

        return NoContent();
    }

    // PATCH /api/orders/{id}/cancel
    [HttpPatch("{id}/cancel")]
    public async Task<IActionResult> CancelOrder(string id, [FromBody] CancelOrderRequest request)
    {
        var userId = GetUserId();
        var success = await _orderService.CancelOrderAsync(userId, id, request.Reason, request.Notes);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    // DELETE /api/orders/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrder(string id)
    {
        var userId = GetUserId();
        var success = await _orderService.DeleteUserOrderAsync(userId, id);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    // POST /api/orders/{orderId}/complete-with-proof
    [HttpPost("{orderId}/complete-with-proof")]
    [Authorize(Roles = "delivery")]
    [RequestSizeLimit(MaxProofImageBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxProofImageBytes)]
    public async Task<IActionResult> CompleteOrderWithProof(string orderId, [FromForm] CompleteOrderWithProofRequest request)
    {
        var courierId = GetUserId();

        string? photoPath = null;
        string? photoUrl = null;

        if (request.ProofPhoto != null && request.ProofPhoto.Length > 0)
        {
            if (request.ProofPhoto.Length > MaxProofImageBytes)
            {
                return BadRequest($"Proof photo is too large. Max size is {MaxProofImageBytes / (1024 * 1024)}MB.");
            }

            if (string.IsNullOrWhiteSpace(request.ProofPhoto.ContentType) || !AllowedImageContentTypes.Contains(request.ProofPhoto.ContentType))
            {
                return BadRequest("Unsupported proof photo type. Allowed: jpeg, png, webp.");
            }

            if (_imageUploadService.IsEnabled)
            {
                try
                {
                    await using var stream = request.ProofPhoto.OpenReadStream();
                    var upload = await _imageUploadService.UploadImageAsync(
                        stream,
                        fileName: request.ProofPhoto.FileName,
                        folder: "order-proofs",
                        contentType: request.ProofPhoto.ContentType,
                        cancellationToken: HttpContext.RequestAborted);

                    // Store Cloudinary public_id as PhotoPath (lightweight identifier) and secure_url as PhotoUrl.
                    photoPath = upload.PublicId;
                    photoUrl = upload.SecureUrl;
                }
                catch
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, "Proof photo upload failed.");
                }
            }
            else
            {
                // Fallback: Convert uploaded image to a Base64 data URL (keeps existing behavior for dev).
                photoPath = request.ProofPhoto.FileName;

                using var ms = new MemoryStream();
                await request.ProofPhoto.CopyToAsync(ms, HttpContext.RequestAborted);
                var bytes = ms.ToArray();
                var base64 = Convert.ToBase64String(bytes);

                var contentType = request.ProofPhoto.ContentType;
                if (string.IsNullOrWhiteSpace(contentType))
                {
                    contentType = "image/jpeg";
                }

                photoUrl = $"data:{contentType};base64,{base64}";
            }
        }

        var success = await _orderService.CompleteOrderWithProofAsync(
            courierId,
            orderId,
            request.Notes,
            request.QuantityNotes,
            request.UpdatedQuantities,
            photoPath,
            photoUrl);

        if (!success)
        {
            return BadRequest("Order cannot be processed for completion by this courier.");
        }

        return NoContent();
    }

    public class AssignCourierRequest
    {
        public string CourierId { get; set; } = null!;
        public string Status { get; set; } = null!;
    }

    // PUT /api/orders/{orderId}/assign-courier
    [HttpPut("{orderId}/assign-courier")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AssignCourier(string orderId, [FromBody] AssignCourierRequest request)
    {
        var success = await _orderService.AssignCourierAsync(orderId, request.CourierId, request.Status);
        if (!success)
        {
            return BadRequest("Invalid order, courier, or status transition.");
        }

        return NoContent();
    }

    private async Task<object> MapToNodeOrderAsync(OrderDto order, string userId)
    {
        // Handle null or empty items list
        var items = (order.Items ?? Array.Empty<OrderItemDto>()).Select(i => new
        {
            _id = i.ItemId ?? i.Id.ToString(),
            name = new
            {
                en = i.NameEn ?? string.Empty,
                ar = i.NameAr ?? string.Empty
            },
            categoryName = new
            {
                en = i.CategoryNameEn ?? string.Empty,
                ar = i.CategoryNameAr ?? string.Empty
            },
            image = i.Image ?? string.Empty,
            points = i.Points,
            price = i.Price,
            measurement_unit = i.MeasurementUnit,
            quantity = i.Quantity,
            itemName = i.NameEn ?? string.Empty,
            totalPoints = i.Points * i.Quantity,
            originalQuantity = (decimal?)null,
            description = (string?)null
        }).ToList();

        object address;

        if (!string.IsNullOrWhiteSpace(order.AddressId))
        {
            try
            {
                var addressDto = await _addressService.GetAddressAsync(userId, order.AddressId);
                if (addressDto != null)
            {
                address = new
                {
                    _id = addressDto.Id,
                    city = addressDto.City,
                    area = addressDto.Area,
                    street = addressDto.Street,
                    building = addressDto.Building ?? string.Empty,
                    floor = addressDto.Floor ?? string.Empty,
                    apartment = addressDto.Apartment ?? string.Empty,
                    landmark = addressDto.Landmark ?? string.Empty,
                    notes = addressDto.Notes ?? string.Empty
                };
            }
            else
            {
                address = new
                {
                    city = string.Empty,
                    area = string.Empty,
                    street = string.Empty,
                    building = string.Empty,
                    floor = string.Empty,
                    apartment = string.Empty,
                    landmark = string.Empty,
                    notes = string.Empty
                };
            }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the entire request
                // Use empty address if lookup fails
                Console.WriteLine($"Error fetching address for order {order.Id}: {ex.Message}");
                address = new
                {
                    city = string.Empty,
                    area = string.Empty,
                    street = string.Empty,
                    building = string.Empty,
                    floor = string.Empty,
                    apartment = string.Empty,
                    landmark = string.Empty,
                    notes = string.Empty
                };
            }
        }
        else
        {
            address = new
            {
                city = string.Empty,
                area = string.Empty,
                street = string.Empty,
                building = string.Empty,
                floor = string.Empty,
                apartment = string.Empty,
                landmark = string.Empty,
                notes = string.Empty
            };
        }

        return new
        {
            _id = order.Id,
            userId,
            status = order.Status,
            createdAt = order.CreatedAt,
            updatedAt = order.CreatedAt,
            address,
            items,
            deliveryFee = order.DeliveryFee,
            paymentMethod = order.PaymentMethod,
            totalAmount = order.TotalAmount,
            totalPrice = order.TotalAmount
        };
    }
}
