using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Auth;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService)
    {
        _profileService = profileService;
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

    [HttpGet]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        var profile = await _profileService.GetProfileAsync(userId);
        if (profile == null)
        {
            return NotFound();
        }

        return Ok(profile);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetUserId();
        var profile = await _profileService.UpdateProfileAsync(userId, request);
        if (profile == null)
        {
            return NotFound();
        }

        return Ok(profile);
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteProfile()
    {
        var userId = GetUserId();
        var success = await _profileService.DeleteProfileAsync(userId);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }
}
