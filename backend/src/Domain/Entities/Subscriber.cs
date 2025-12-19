using System;

namespace Recycling.Domain.Entities;

public class Subscriber
{
    public string Id { get; set; } = null!;
    public string Email { get; set; } = null!;
    public DateTime SubscribedAt { get; set; }
}
