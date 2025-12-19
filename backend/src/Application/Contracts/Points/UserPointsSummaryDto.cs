using System.Collections.Generic;
using Recycling.Application.Contracts.Common;

namespace Recycling.Application.Contracts.Points;

public class UserPointsSummaryDto
{
    public string UserId { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string Email { get; set; } = null!;
    public decimal TotalPoints { get; set; }
    public int TotalRecycled { get; set; }
    public IReadOnlyList<UserPointsHistoryEntryDto> History { get; set; } = new List<UserPointsHistoryEntryDto>();
    public PaginationInfo Pagination { get; set; } = new();
}
