using System;

namespace Recycling.Application.Contracts.Points;

public class OrderWithPointsDto
{
    public string Id { get; set; } = null!;
    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public int PotentialPoints { get; set; }
    public int PointsEarned { get; set; }
}
