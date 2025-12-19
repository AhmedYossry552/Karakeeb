using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/sessions")]
public class SessionsController : ControllerBase
{
    private readonly ISessionService _sessionService;

    public SessionsController(ISessionService sessionService)
    {
        _sessionService = sessionService;
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

    [HttpPost("guest")]
    [AllowAnonymous]
    public async Task<IActionResult> CreateGuestSession()
    {
        var device = Request.Headers["x-device-type"].FirstOrDefault();
        var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers["User-Agent"].FirstOrDefault();

        var sessionId = await _sessionService.CreateGuestSessionAsync(device, ipAddress, userAgent);

        Response.Cookies.Append("sessionId", sessionId, new CookieOptions
        {
            HttpOnly = true,
            Secure = HttpContext.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(30)
        });

        return StatusCode(StatusCodes.Status201Created, new { sessionId });
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetUserSessions()
    {
        var userId = GetUserId();
        var sessions = await _sessionService.GetUserSessionsAsync(userId);

        var data = sessions.Select(s => new
        {
            id = s.Id,
            sessionId = s.SessionId,
            device = s.Device,
            ipAddress = s.IpAddress,
            userAgent = s.UserAgent,
            isValid = s.IsValid,
            createdAt = s.CreatedAt,
            expiresAt = s.ExpiresAt,
            lastUsedAt = s.LastUsedAt
        });

        return Ok(data);
    }

    [HttpPatch("{sessionId}/invalidate")]
    [Authorize]
    public async Task<IActionResult> InvalidateSession(string sessionId)
    {
        var success = await _sessionService.InvalidateSessionAsync(sessionId);
        if (!success)
        {
            return NotFound();
        }

        return Ok(new { message = "Session invalidated" });
    }

    public class UpgradeSessionRequest
    {
        public string SessionId { get; set; } = null!;
    }

    [HttpPost("upgrade")]
    [Authorize]
    public async Task<IActionResult> UpgradeGuestSession([FromBody] UpgradeSessionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SessionId))
        {
            return BadRequest(new { message = "SessionId is required" });
        }

        var userId = GetUserId();
        var success = await _sessionService.UpgradeGuestSessionAsync(request.SessionId, userId);
        if (!success)
        {
            return NotFound();
        }

        return Ok(new { message = "Session upgraded to user" });
    }
}
