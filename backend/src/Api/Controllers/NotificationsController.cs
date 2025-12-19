using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
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
    public async Task<IActionResult> GetUserNotifications([FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        try
        {
            var userId = GetUserId();
            var result = await _notificationService.GetUserNotificationsAsync(userId, page, limit);
            var nodeNotifications = result.Notifications
                .Select(n => new
                {
                    _id = n.Id,
                    title = new
                    {
                        en = n.TitleEn,
                        ar = n.TitleAr
                    },
                    body = new
                    {
                        en = n.BodyEn,
                        ar = n.BodyAr
                    },
                    type = n.Type,
                    orderId = n.OrderId,
                    isRead = n.IsRead,
                    createdAt = n.CreatedAt
                })
                .ToList();

            var pagination = result.Pagination;

            return Ok(new
            {
                success = true,
                data = new
                {
                    notifications = nodeNotifications,
                    pagination = new
                    {
                        currentPage = pagination.CurrentPage,
                        totalPages = pagination.TotalPages,
                        totalNotifications = pagination.TotalItems,
                        hasMore = pagination.HasNextPage
                    },
                    unreadCount = result.UnreadCount
                }
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "An error occurred while fetching notifications", error = ex.Message });
        }
    }

    [HttpGet("unread-count")]
    public async Task<IActionResult> GetUnreadCount()
    {
        var userId = GetUserId();
        var count = await _notificationService.GetUnreadCountAsync(userId);
        return Ok(new { unreadCount = count });
    }

    public class MarkNotificationsReadRequest
    {
        public List<string>? NotificationIds { get; set; }
    }

    [HttpPatch("mark-read")]
    public async Task<IActionResult> MarkNotificationsAsRead([FromBody] MarkNotificationsReadRequest request)
    {
        var userId = GetUserId();
        var ids = request.NotificationIds ?? new List<string>();
        var modified = await _notificationService.MarkNotificationsAsReadAsync(userId, ids);
        return Ok(new { modifiedCount = modified });
    }

    [HttpPatch("{id}/mark-read")]
    public async Task<IActionResult> MarkNotificationAsRead(string id)
    {
        var userId = GetUserId();
        var success = await _notificationService.MarkNotificationAsReadAsync(userId, id);
        if (!success)
        {
            return NotFound();
        }

        return Ok();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(string id)
    {
        var userId = GetUserId();
        var success = await _notificationService.DeleteNotificationAsync(userId, id);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteAllNotifications()
    {
        var userId = GetUserId();
        var count = await _notificationService.DeleteAllNotificationsAsync(userId);
        return Ok(new { deletedCount = count });
    }
}
