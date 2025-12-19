using System.Collections.Generic;
using Recycling.Application.Contracts.Common;

namespace Recycling.Application.Contracts.Notifications;

public class UserNotificationsResponseDto
{
    public IReadOnlyList<NotificationDto> Notifications { get; set; } = new List<NotificationDto>();
    public PaginationInfo Pagination { get; set; } = null!;
    public int UnreadCount { get; set; }
}
