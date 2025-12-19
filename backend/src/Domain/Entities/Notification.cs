using System;

namespace Recycling.Domain.Entities;

public class Notification
{
    public string Id { get; set; } = null!;
    public string UserId { get; set; } = null!;
    public string TitleEn { get; set; } = null!;
    public string TitleAr { get; set; } = null!;
    public string BodyEn { get; set; } = null!;
    public string BodyAr { get; set; } = null!;
    public string Type { get; set; } = null!;
    public string? OrderId { get; set; }
    public string? DataJson { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
}
