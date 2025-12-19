using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Application.Contracts.Notifications;

namespace Recycling.Application.Abstractions;

public interface INotificationService
{
    Task<UserNotificationsResponseDto> GetUserNotificationsAsync(string userId, int page, int limit);
    Task<int> GetUnreadCountAsync(string userId);
    Task<int> MarkNotificationsAsReadAsync(string userId, IReadOnlyList<string>? notificationIds);
    Task<bool> MarkNotificationAsReadAsync(string userId, string notificationId);
    Task<bool> DeleteNotificationAsync(string userId, string notificationId);
    Task<int> DeleteAllNotificationsAsync(string userId);

    Task CreateOrderAssignedNotificationAsync(string userId, string orderId);
    Task CreateOrderCancelledNotificationAsync(string userId, string orderId, string reason);
    Task CreateOrderCompletedNotificationAsync(string userId, string orderId);
    Task CreateOrderStatusChangeNotificationAsync(string userId, string orderId, string oldStatus, string newStatus);
}
