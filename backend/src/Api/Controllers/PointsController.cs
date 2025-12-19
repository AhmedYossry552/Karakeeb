using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/points")]
public class PointsController : ControllerBase
{
    private readonly IPointsService _pointsService;

    public PointsController(IPointsService pointsService)
    {
        _pointsService = pointsService;
    }

    private string GetUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            throw new UnauthorizedAccessException("User id not found in token");
        }

        return userId;
    }

    // GET /api/points/me?limit=&page=
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMyPoints([FromQuery] int page = 1, [FromQuery] int limit = 10)
    {
        var userId = GetUserId();
        var result = await _pointsService.GetUserPointsAsync(userId, page, limit);
        return Ok(result);
    }

    // GET /api/points/{userId}?limit=&page= (admin)
    [HttpGet("{userId}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetUserPoints(string userId, [FromQuery] int page = 1, [FromQuery] int limit = 10)
    {
        var result = await _pointsService.GetUserPointsAsync(userId, page, limit);
        return Ok(result);
    }

    // GET /api/points/leaderboard?limit=
    [HttpGet("leaderboard")]
    [AllowAnonymous]
    public async Task<IActionResult> GetLeaderboard([FromQuery] int limit = 10)
    {
        var result = await _pointsService.GetLeaderboardAsync(limit);

        var data = System.Linq.Enumerable.Select(result, u => new
        {
            rank = u.Rank,
            userId = u.UserId,
            name = u.Name,
            email = u.Email,
            totalPoints = u.TotalPoints,
            imageUrl = u.ImageUrl
        });

        return Ok(new
        {
            success = true,
            data
        });
    }

    public class AddPointsRequest
    {
        public int Points { get; set; }
        public string? OrderId { get; set; }
        public string? Reason { get; set; }
    }

    public class DeductPointsInput
    {
        public int Points { get; set; }
        public string? Reason { get; set; }
    }

    // POST /api/points/{userId}
    [HttpPost("{userId}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> AddPoints(string userId, [FromBody] AddPointsRequest request)
    {
        await _pointsService.AddUserPointsAsync(userId, request.Points, request.OrderId, request.Reason);
        return Ok();
    }

    // POST /api/points/{userId}/deduct (admin only)
    [HttpPost("{userId}/deduct")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> DeductPoints(string userId, [FromBody] DeductPointsInput request)
    {
        await _pointsService.DeductUserPointsAsync(userId, request.Points, request.Reason);
        return Ok();
    }
}
