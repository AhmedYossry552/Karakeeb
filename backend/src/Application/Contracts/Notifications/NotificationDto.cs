using System;

namespace Recycling.Application.Contracts.Notifications;

public class NotificationDto
{
    public string Id { get; set; } = null!;
    public string TitleEn { get; set; } = null!;
    public string TitleAr { get; set; } = null!;
    public string BodyEn { get; set; } = null!;
    public string BodyAr { get; set; } = null!;
    public string Type { get; set; } = null!;
    public string? OrderId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
