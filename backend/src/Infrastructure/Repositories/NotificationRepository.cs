using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class NotificationRepository : INotificationRepository
{
    private readonly RecyclingDbContext _context;

    public NotificationRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Notification notification)
    {
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();
    }

    public async Task<(IReadOnlyList<Notification> Items, int TotalCount, int UnreadCount)> GetByUserIdPagedAsync(string userId, int page, int pageSize)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 20;

        var baseQuery = _context.Notifications.Where(n => n.UserId == userId);

        var totalCount = await baseQuery.CountAsync();
        var unreadCount = await baseQuery.Where(n => !n.IsRead).CountAsync();

        var items = await baseQuery
            .OrderByDescending(n => n.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .AsNoTracking()
            .ToListAsync();

        return (items, totalCount, unreadCount);
    }

    public async Task<int> GetUnreadCountAsync(string userId)
    {
        return await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .CountAsync();
    }

    public async Task<int> MarkAllAsReadAsync(string userId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
        }

        await _context.SaveChangesAsync();
        return notifications.Count;
    }

    public async Task<int> MarkAsReadAsync(string userId, IReadOnlyList<string> notificationIds)
    {
        if (notificationIds == null || notificationIds.Count == 0)
        {
            return 0;
        }

        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead && notificationIds.Contains(n.Id))
            .ToListAsync();

        foreach (var notification in notifications)
        {
            notification.IsRead = true;
        }

        await _context.SaveChangesAsync();
        return notifications.Count;
    }

    public async Task<Notification?> MarkOneAsReadAsync(string userId, string notificationId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification == null)
        {
            return null;
        }

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            await _context.SaveChangesAsync();
        }

        return notification;
    }

    public async Task<int> DeleteAllAsync(string userId)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId)
            .ToListAsync();

        if (notifications.Count == 0)
        {
            return 0;
        }

        _context.Notifications.RemoveRange(notifications);
        await _context.SaveChangesAsync();

        return notifications.Count;
    }

    public async Task<bool> DeleteOneAsync(string userId, string notificationId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification == null)
        {
            return false;
        }

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();
        return true;
    }
}
