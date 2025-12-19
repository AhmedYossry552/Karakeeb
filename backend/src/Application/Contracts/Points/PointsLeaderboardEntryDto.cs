namespace Recycling.Application.Contracts.Points;

public class PointsLeaderboardEntryDto
{
    public int Rank { get; set; }
    public string UserId { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public decimal TotalPoints { get; set; }
    public string? ImageUrl { get; set; }
}
