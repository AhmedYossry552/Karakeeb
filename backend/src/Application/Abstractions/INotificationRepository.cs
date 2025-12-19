using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface INotificationRepository
{
    Task AddAsync(Notification notification);
    Task<(IReadOnlyList<Notification> Items, int TotalCount, int UnreadCount)> GetByUserIdPagedAsync(string userId, int page, int pageSize);
    Task<int> GetUnreadCountAsync(string userId);
    Task<int> MarkAllAsReadAsync(string userId);
    Task<int> MarkAsReadAsync(string userId, IReadOnlyList<string> notificationIds);
    Task<Notification?> MarkOneAsReadAsync(string userId, string notificationId);
    Task<int> DeleteAllAsync(string userId);
    Task<bool> DeleteOneAsync(string userId, string notificationId);
}
