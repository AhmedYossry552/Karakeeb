using System;
using System.Security.Claims;
using System.IO;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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
    private readonly IImageUploadService _imageUploadService;

    public ProfileController(IProfileService profileService, IImageUploadService imageUploadService)
    {
        _profileService = profileService;
        _imageUploadService = imageUploadService;
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

    // POST /api/profile/upload-image
    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadProfileImage([FromForm] IFormFile image)
    {
        if (image == null || image.Length <= 0)
        {
            return BadRequest("Image is required.");
        }

        var userId = GetUserId();

        string imgUrl;
        if (_imageUploadService.IsEnabled)
        {
            try
            {
                await using var stream = image.OpenReadStream();
                var upload = await _imageUploadService.UploadImageAsync(
                    stream,
                    fileName: image.FileName,
                    folder: "profiles",
                    contentType: image.ContentType,
                    cancellationToken: HttpContext.RequestAborted);
                imgUrl = upload.SecureUrl;
            }
            catch
            {
                return StatusCode(StatusCodes.Status500InternalServerError, "Profile image upload failed.");
            }
        }
        else
        {
            // Fallback for dev environments without Cloudinary credentials.
            await using var ms = new MemoryStream();
            await image.CopyToAsync(ms, HttpContext.RequestAborted);
            var base64 = Convert.ToBase64String(ms.ToArray());

            var contentType = image.ContentType;
            if (string.IsNullOrWhiteSpace(contentType))
            {
                contentType = "image/jpeg";
            }

            imgUrl = $"data:{contentType};base64,{base64}";
        }

        var updated = await _profileService.UpdateProfileAsync(userId, new UpdateProfileRequest
        {
            ImgUrl = imgUrl
        });

        if (updated == null)
        {
            return NotFound();
        }

        return Ok(updated);
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
