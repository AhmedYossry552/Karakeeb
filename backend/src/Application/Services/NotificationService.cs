using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Common;
using Recycling.Application.Contracts.Notifications;
using Recycling.Domain.Entities;

namespace Recycling.Application.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepository;

    public NotificationService(INotificationRepository notificationRepository)
    {
        _notificationRepository = notificationRepository;
    }

    public async Task<UserNotificationsResponseDto> GetUserNotificationsAsync(string userId, int page, int limit)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 20;

        var (items, totalCount, unreadCount) = await _notificationRepository.GetByUserIdPagedAsync(userId, page, limit);

        var notifications = items.Select(n => new NotificationDto
        {
            Id = n.Id,
            TitleEn = n.TitleEn,
            TitleAr = n.TitleAr,
            BodyEn = n.BodyEn,
            BodyAr = n.BodyAr,
            Type = n.Type,
            OrderId = n.OrderId,
            IsRead = n.IsRead,
            CreatedAt = n.CreatedAt
        }).ToList();

        var totalPages = (int)Math.Ceiling(totalCount / (double)limit);

        return new UserNotificationsResponseDto
        {
            Notifications = notifications,
            Pagination = new PaginationInfo
            {
                CurrentPage = page,
                ItemsPerPage = limit,
                TotalItems = totalCount,
                TotalPages = totalPages,
                HasNextPage = page < totalPages
            },
            UnreadCount = unreadCount
        };
    }

    public Task<int> GetUnreadCountAsync(string userId)
    {
        return _notificationRepository.GetUnreadCountAsync(userId);
    }

    public Task<int> MarkNotificationsAsReadAsync(string userId, IReadOnlyList<string>? notificationIds)
    {
        if (notificationIds == null || notificationIds.Count == 0)
        {
            return _notificationRepository.MarkAllAsReadAsync(userId);
        }

        return _notificationRepository.MarkAsReadAsync(userId, notificationIds);
    }

    public async Task<bool> MarkNotificationAsReadAsync(string userId, string notificationId)
    {
        var notification = await _notificationRepository.MarkOneAsReadAsync(userId, notificationId);
        return notification != null;
    }

    public Task<bool> DeleteNotificationAsync(string userId, string notificationId)
    {
        return _notificationRepository.DeleteOneAsync(userId, notificationId);
    }

    public Task<int> DeleteAllNotificationsAsync(string userId)
    {
        return _notificationRepository.DeleteAllAsync(userId);
    }

    public Task CreateOrderAssignedNotificationAsync(string userId, string orderId)
    {
        return CreateNotificationAsync(
            userId,
            "Order Assigned",
            "تم تعيين الطلب",
            "Your order has been assigned to a courier. Expect them within 48 hours.",
            "تم تعيين طلبك إلى المندوب. توقع وصوله خلال 48 ساعة.",
            "order_assigned",
            orderId,
            null);
    }

    public Task CreateOrderCancelledNotificationAsync(string userId, string orderId, string reason)
    {
        var data = new { cancelReason = reason };

        return CreateNotificationAsync(
            userId,
            "Order Cancelled",
            "تم إلغاء الطلب",
            $"Your order was cancelled. Reason: {reason}",
            $"تم إلغاء طلبك. السبب: {reason}",
            "order_cancelled",
            orderId,
            data);
    }

    public Task CreateOrderCompletedNotificationAsync(string userId, string orderId)
    {
        return CreateNotificationAsync(
            userId,
            "Order Completed",
            "تم إكمال الطلب",
            "Your recycling order has been completed successfully. Thank you for contributing to a cleaner environment!",
            "تم إكمال طلب إعادة التدوير بنجاح. شكرًا لك على المساهمة في بيئة أنظف!",
            "order_completed",
            orderId,
            null);
    }

    public Task CreateOrderStatusChangeNotificationAsync(string userId, string orderId, string oldStatus, string newStatus)
    {
        var data = new { oldStatus, newStatus };

        string titleEn = "Order Status Updated";
        string titleAr = "تم تحديث حالة الطلب";
        string bodyEn;
        string bodyAr;

        switch (newStatus)
        {
            case "pending":
                bodyEn = "Your order is now pending review.";
                bodyAr = "طلبك الآن في انتظار المراجعة.";
                break;
            case "assigntocourier":
                bodyEn = "Your order has been assigned to a courier. Expect them within 48 hours.";
                bodyAr = "تم تعيين طلبك إلى المندوب. توقع وصوله خلال 48 ساعة.";
                break;
            case "completed":
                bodyEn = "Your recycling order has been completed successfully!";
                bodyAr = "تم إكمال طلب إعادة التدوير بنجاح!";
                break;
            case "cancelled":
                bodyEn = "Your order has been cancelled.";
                bodyAr = "تم إلغاء طلبك.";
                break;
            default:
                bodyEn = $"Your order status has been updated from {oldStatus} to {newStatus}.";
                bodyAr = $"تم تحديث حالة طلبك من {oldStatus} إلى {newStatus}.";
                break;
        }

        return CreateNotificationAsync(
            userId,
            titleEn,
            titleAr,
            bodyEn,
            bodyAr,
            "order_status",
            orderId,
            data);
    }

    private async Task CreateNotificationAsync(
        string userId,
        string titleEn,
        string titleAr,
        string bodyEn,
        string bodyAr,
        string type,
        string? orderId,
        object? data)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            TitleEn = titleEn,
            TitleAr = titleAr,
            BodyEn = bodyEn,
            BodyAr = bodyAr,
            Type = type,
            OrderId = orderId,
            DataJson = data != null ? JsonSerializer.Serialize(data) : null,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        await _notificationRepository.AddAsync(notification);
    }
}
