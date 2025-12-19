using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Orders;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Roles = "admin")]
public class AdminOrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IOrderRepository _orderRepository;

    public AdminOrdersController(IOrderService orderService, IOrderRepository orderRepository)
    {
        _orderService = orderService;
        _orderRepository = orderRepository;
    }

    // GET /api/admin/orders?page=&limit=&status=&date=&userRole=&search=
    [HttpGet]
    public async Task<IActionResult> GetAdminOrders(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? status = null,
        [FromQuery] string? date = null,
        [FromQuery] string? userRole = null,
        [FromQuery] string? search = null)
    {
        var result = await _orderService.GetAdminOrdersAsync(page, limit, status, userRole, date, search);

        var pagination = result.Pagination;

        return Ok(new
        {
            success = true,
            count = result.Data.Count,
            totalOrders = pagination.TotalItems,
            totalPages = pagination.TotalPages,
            currentPage = pagination.CurrentPage,
            data = result.Data.Select(o => new
            {
                _id = o.Id,
                orderId = o.Id,
                userId = o.UserId,
                userName = o.UserName,
                userEmail = o.UserEmail,
                userRole = o.UserRole ?? "customer",
                userPhoneNumber = o.UserPhoneNumber,
                status = o.Status,
                createdAt = o.CreatedAt,
                collectedAt = o.CollectedAt,
                completedAt = o.CompletedAt,
                user = new
                {
                    userName = o.UserName,
                    name = o.UserName,
                    email = o.UserEmail,
                    role = o.UserRole ?? "customer",
                    phoneNumber = o.UserPhoneNumber
                },
                address = o.Address == null ? null : new
                {
                    _id = o.Address.Id,
                    city = o.Address.City,
                    area = o.Address.Area,
                    street = o.Address.Street,
                    building = o.Address.Building,
                    floor = o.Address.Floor,
                    apartment = o.Address.Apartment,
                    landmark = o.Address.Landmark,
                    notes = o.Address.Notes
                },
                courier = string.IsNullOrWhiteSpace(o.CourierId) ? null : new
                {
                    _id = o.CourierId,
                    name = o.CourierName
                },
                statusHistory = o.StatusHistory.Select(h => new
                {
                    status = h.Status,
                    timestamp = h.Timestamp,
                    updatedBy = h.UpdatedBy,
                    notes = h.Notes
                }),
                items = o.Items.Select(i => new
                {
                    _id = i.Id,
                    name = new { en = i.NameEn, ar = i.NameAr },
                    image = i.Image,
                    quantity = i.Quantity,
                    price = i.Price,
                    points = i.Points,
                    categoryId = i.ItemId,
                    categoryName = new { en = i.CategoryNameEn, ar = i.CategoryNameAr },
                    measurement_unit = i.MeasurementUnit
                }),
                paymentMethod = o.PaymentMethod,
                deliveryFee = o.DeliveryFee,
                totalAmount = o.TotalAmount,
                deliveryProof = o.DeliveryProofPhotoUrl == null && o.DeliveryProofNotes == null
                    ? null
                    : new
                    {
                        photoUrl = o.DeliveryProofPhotoUrl,
                        notes = o.DeliveryProofNotes
                    }
            })
        });
    }

    // GET /api/admin/orders/{id}
    [HttpGet("{id}")]
    public async Task<IActionResult> GetAdminOrderById(string id)
    {
        // Reuse the admin orders service with search by id, then filter exactly
        var result = await _orderService.GetAdminOrdersAsync(1, 1, null, null, null, id);
        var o = result.Data.FirstOrDefault(x => x.Id == id);
        if (o == null)
        {
            return NotFound();
        }

        return Ok(new
        {
            success = true,
            data = new
            {
                _id = o.Id,
                orderId = o.Id,
                userId = o.UserId,
                userName = o.UserName,
                userEmail = o.UserEmail,
                userRole = o.UserRole ?? "customer",
                userPhoneNumber = o.UserPhoneNumber,
                status = o.Status,
                createdAt = o.CreatedAt,
                collectedAt = o.CollectedAt,
                completedAt = o.CompletedAt,
                user = new
                {
                    userName = o.UserName,
                    name = o.UserName,
                    email = o.UserEmail,
                    role = o.UserRole ?? "customer",
                    phoneNumber = o.UserPhoneNumber
                },
                address = o.Address == null ? null : new
                {
                    _id = o.Address.Id,
                    city = o.Address.City,
                    area = o.Address.Area,
                    street = o.Address.Street,
                    building = o.Address.Building,
                    floor = o.Address.Floor,
                    apartment = o.Address.Apartment,
                    landmark = o.Address.Landmark,
                    notes = o.Address.Notes
                },
                courier = string.IsNullOrWhiteSpace(o.CourierId) ? null : new
                {
                    _id = o.CourierId,
                    name = o.CourierName
                },
                statusHistory = o.StatusHistory.Select(h => new
                {
                    status = h.Status,
                    timestamp = h.Timestamp,
                    updatedBy = h.UpdatedBy,
                    notes = h.Notes
                }),
                items = o.Items.Select(i => new
                {
                    _id = i.Id,
                    name = new { en = i.NameEn, ar = i.NameAr },
                    image = i.Image,
                    quantity = i.Quantity,
                    price = i.Price,
                    points = i.Points,
                    categoryId = i.ItemId,
                    categoryName = new { en = i.CategoryNameEn, ar = i.CategoryNameAr },
                    measurement_unit = i.MeasurementUnit
                }),
                paymentMethod = o.PaymentMethod,
                deliveryFee = o.DeliveryFee,
                totalAmount = o.TotalAmount,
                deliveryProof = o.DeliveryProofPhotoUrl == null && o.DeliveryProofNotes == null
                    ? null
                    : new
                    {
                        photoUrl = o.DeliveryProofPhotoUrl,
                        notes = o.DeliveryProofNotes
                    }
            }
        });
    }

    [HttpGet("{id}/delivery-proof")]
    public async Task<IActionResult> GetDeliveryProof(string id)
    {
        var order = await _orderRepository.GetByIdAsync(id);
        if (order == null)
        {
            return NotFound();
        }

        var latestProof = order.DeliveryProofs
            .OrderByDescending(p => p.UploadedAt)
            .FirstOrDefault();

        if (latestProof == null)
        {
            return NotFound();
        }

        return Ok(new
        {
            success = true,
            data = new
            {
                photoUrl = latestProof.PhotoUrl,
                notes = latestProof.Notes,
                uploadedAt = latestProof.UploadedAt,
                completedBy = latestProof.CompletedBy
            }
        });
    }

    // PUT /api/admin/orders/{id}/status
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(string id, [FromBody] UpdateOrderStatusRequest request)
    {
        var success = await _orderService.AdminUpdateOrderStatusAsync(id, request.Status, request.Reason, request.Notes);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    // DELETE /api/admin/orders/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOrder(string id)
    {
        var success = await _orderService.AdminDeleteOrderAsync(id);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    // GET /api/admin/orders/courier/{courierId}
    [HttpGet("courier/{courierId}")]
    public async Task<IActionResult> GetOrdersByCourier(string courierId)
    {
        var orders = await _orderService.GetOrdersByCourierAsync(courierId);
        return Ok(orders);
    }
}
