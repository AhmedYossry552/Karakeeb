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

    private static readonly HashSet<string> AllowedImageContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp"
    };

    private const long MaxImageBytes = 5 * 1024 * 1024; // 5 MB

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
        if (!string.IsNullOrWhiteSpace(request.ImgUrl) && request.ImgUrl.Length > 1024)
        {
            return BadRequest(new
            {
                message = "Profile image payload is too large. Use /api/profile/upload-image instead of sending base64 in ImgUrl."
            });
        }

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
    [RequestSizeLimit(MaxImageBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxImageBytes)]
    public async Task<IActionResult> UploadProfileImage([FromForm] IFormFile image)
    {
        if (image == null || image.Length <= 0)
        {
            return BadRequest("Image is required.");
        }

        if (image.Length > MaxImageBytes)
        {
            return BadRequest($"Image is too large. Max size is {MaxImageBytes / (1024 * 1024)}MB.");
        }

        if (string.IsNullOrWhiteSpace(image.ContentType) || !AllowedImageContentTypes.Contains(image.ContentType))
        {
            return BadRequest("Unsupported image type. Allowed: jpeg, png, webp.");
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
