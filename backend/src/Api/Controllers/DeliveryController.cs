using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Auth;
using Recycling.Application.Contracts.Delivery;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api")]
public class DeliveryController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IDeliveryService _deliveryService;

    public DeliveryController(IAuthService authService, IDeliveryService deliveryService)
    {
        _authService = authService;
        _deliveryService = deliveryService;
    }

    // POST /api/registerDelivery
    [HttpPost("registerDelivery")]
    [AllowAnonymous]
    public async Task<IActionResult> RegisterDelivery([FromBody] RegisterDeliveryRequest request)
    {
        try
        {
            var response = await _authService.RegisterDeliveryAsync(request);
            if (!string.IsNullOrWhiteSpace(response.RefreshToken))
            {
                var cookieOptions = new CookieOptions
                {
                    HttpOnly = true,
                    Secure = HttpContext.Request.IsHttps,
                    SameSite = SameSiteMode.Lax,
                    Expires = DateTimeOffset.UtcNow.AddDays(7),
                    Path = "/"
                };

                Response.Cookies.Append("refreshToken", response.RefreshToken, cookieOptions);
            }

            var user = new
            {
                _id = response.Id,
                name = response.Name,
                email = response.Email,
                phoneNumber = response.PhoneNumber,
                provider = response.Provider ?? "none",
                role = response.Role,
                isApproved = response.IsApproved,
                imgUrl = response.ImgUrl,
                createdAt = response.CreatedAt,
                updatedAt = response.UpdatedAt,
                lastActiveAt = response.LastActiveAt,
                attachments = new { }
            };

            return Ok(new { user, accessToken = response.Token });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // GET /api/deliveries (admin only)
    [HttpGet("deliveries")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetDeliveries()
    {
        var deliveries = await _deliveryService.GetAllAsync();
        return Ok(deliveries);
    }

    // GET /api/delivery/{id} (admin only)
    [HttpGet("delivery/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetDeliveryById(string id)
    {
        var delivery = await _deliveryService.GetByIdAsync(id);
        if (delivery == null)
        {
            return NotFound();
        }

        return Ok(delivery);
    }

    // GET /api/delivery-attachments (admin only)
    // Returns a list of delivery users with their attachment details,
    // similar to the Node.js getDeliveryAttachmentsEnhanced endpoint.
    [HttpGet("delivery-attachments")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetDeliveryAttachments()
    {
        var deliveries = await _deliveryService.GetAllAsync();

        var data = deliveries.Select(d =>
        {
            var currentStatus = !string.IsNullOrWhiteSpace(d.Status)
                ? d.Status
                : (d.IsApproved ? "approved" : "pending");

            var canReapply = string.Equals(currentStatus, "declined", StringComparison.OrdinalIgnoreCase)
                || string.Equals(currentStatus, "revoked", StringComparison.OrdinalIgnoreCase);

            var attachments = new
            {
                deliveryImage = d.DeliveryImage,
                vehicleImage = d.VehicleImage,
                criminalRecord = d.CriminalRecord,
                licenseNumber = d.LicenseNumber,
                nationalId = d.NationalId,
                vehicleType = d.VehicleType
            };

            return new
            {
                userId = d.Id,
                name = d.Name,
                email = d.Email,
                phoneNumber = d.PhoneNumber,
                isApproved = d.IsApproved,
                currentStatus,
                createdAt = (DateTime?)null,
                attachments,
                canReapply
            };
        }).ToList();

        return Ok(new
        {
            success = true,
            message = "Delivery attachments retrieved successfully",
            count = data.Count,
            data
        });
    }

    // PATCH /api/delivery/{id}/approve (admin only)
    [HttpPatch("delivery/{id}/approve")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ApproveDelivery(string id, [FromBody] DeliveryApprovalRequest request)
    {
        var success = await _deliveryService.UpdateApprovalStatusAsync(id, request.IsApproved);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    public class DeliveryRevokeRequest
    {
        public string? Reason { get; set; }
    }

    // PATCH /api/delivery/revoke/{id} (admin only)
    [HttpPatch("delivery/revoke/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> RevokeDelivery(string id, [FromBody] DeliveryRevokeRequest request)
    {
        var success = await _deliveryService.RevokeAsync(id, request?.Reason);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    public class DeliveryReapplyRequest
    {
        public string Email { get; set; } = null!;
    }

    // POST /api/delivery/reapply
    [HttpPost("delivery/reapply")]
    [AllowAnonymous]
    public async Task<IActionResult> ReapplyDelivery([FromBody] DeliveryReapplyRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Email is required" });
        }

        var (success, previousStatus) = await _deliveryService.ReapplyAsync(request.Email);
        if (!success)
        {
            return NotFound(new { message = "Delivery user not found or cannot reapply", previousStatus });
        }

        return Ok(new
        {
            message = "Previous application reset. You can now reapply.",
            previousStatus
        });
    }
}
