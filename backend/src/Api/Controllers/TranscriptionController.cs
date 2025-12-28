using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using Recycling.Application.Abstractions;
using Recycling.Application.Services;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TranscriptionController : ControllerBase
{
    private const long MaxAudioBytes = 25 * 1024 * 1024;
    private const long MaxImageBytes = 10 * 1024 * 1024;

    private readonly TranscriptionService _transcriptionService;
    private readonly VoiceCartService _voiceCartService;
    private readonly IUserRepository _userRepository;

    public TranscriptionController(
        TranscriptionService transcriptionService,
        VoiceCartService voiceCartService,
        IUserRepository userRepository)
    {
        _transcriptionService = transcriptionService;
        _voiceCartService = voiceCartService;
        _userRepository = userRepository;
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

    [Authorize]
    [HttpPost("transcribe")]
    [RequestSizeLimit(MaxAudioBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxAudioBytes)]
    public async Task<IActionResult> Transcribe([FromForm] IFormFile audio, [FromForm] string language = "ar")
    {
        if (audio == null)
        {
            return BadRequest(new { success = false, message = "Audio file is missing." });
        }

        if (audio.Length > MaxAudioBytes)
        {
            return BadRequest(new { success = false, message = "Audio file too large (max 25MB)." });
        }

        if (string.IsNullOrWhiteSpace(audio.ContentType) ||
            (!audio.ContentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase)
             && !string.Equals(audio.ContentType, "application/octet-stream", StringComparison.OrdinalIgnoreCase)))
        {
            return BadRequest(new { success = false, message = "Invalid audio file type." });
        }

        try
        {
            using var stream = audio.OpenReadStream();
            var result = await _transcriptionService.TranscribeAudioAsync(stream, audio.ContentType, audio.FileName, language);

            if (string.IsNullOrWhiteSpace(result))
            {
                return StatusCode(500, new { success = false, message = "Transcription failed: empty result." });
            }

            return Ok(new { success = true, transcription = result });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Unexpected error during transcription.", details = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("voice-cart")]
    [RequestSizeLimit(MaxAudioBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxAudioBytes)]
    public async Task<IActionResult> VoiceCart([FromForm] IFormFile audio, [FromForm] string language = "ar")
    {
        var userId = GetUserId();
        var user = await _userRepository.GetByIdAsync(userId);

        if (user == null)
        {
            return Unauthorized(new { success = false, message = "User not found." });
        }

        if (audio == null)
        {
            return BadRequest(new { success = false, message = "Audio file is missing." });
        }

        if (audio.Length > MaxAudioBytes)
        {
            return BadRequest(new { success = false, message = "Audio file too large (max 25MB)." });
        }

        if (string.IsNullOrWhiteSpace(audio.ContentType) ||
            (!audio.ContentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase)
             && !string.Equals(audio.ContentType, "application/octet-stream", StringComparison.OrdinalIgnoreCase)))
        {
            return BadRequest(new { success = false, message = "Invalid audio file type." });
        }

        try
        {
            using var stream = audio.OpenReadStream();
            var result = await _voiceCartService.ProcessVoiceToCartAsync(userId, stream, audio.ContentType, audio.FileName, language);

            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Unexpected error during voice cart processing.", details = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("extract-materials")]
    public async Task<IActionResult> ExtractMaterials([FromBody] ExtractMaterialsRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Transcription))
        {
            return BadRequest(new { success = false, message = "Transcription is required." });
        }

        if (string.IsNullOrWhiteSpace(request.MaterialList))
        {
            return BadRequest(new { success = false, message = "Material list is required." });
        }

        try
        {
            var raw = await _transcriptionService.ExtractMaterialsFromTextAsync(request.Transcription, request.MaterialList);

            object? items = null;
            try
            {
                using var doc = JsonDocument.Parse(raw);
                if (doc.RootElement.ValueKind == JsonValueKind.Object &&
                    doc.RootElement.TryGetProperty("items", out var itemsElement) &&
                    itemsElement.ValueKind == JsonValueKind.Array)
                {
                    items = JsonSerializer.Deserialize<object>(itemsElement.GetRawText());
                }
            }
            catch
            {
                // ignore parsing errors; frontend can fallback if needed
            }

            return Ok(new { success = true, raw, items });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Unexpected error during material extraction.", details = ex.Message });
        }
    }

    public sealed record ExtractMaterialsRequest(string Transcription, string MaterialList);

    [Authorize]
    [HttpPost("describe-image")]
    [RequestSizeLimit(MaxImageBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxImageBytes)]
    public async Task<IActionResult> DescribeImage([FromForm] IFormFile image)
    {
        if (image == null)
        {
            return BadRequest(new { success = false, message = "Image file is missing." });
        }

        if (image.Length > MaxImageBytes)
        {
            return BadRequest(new { success = false, message = "Image file too large (max 10MB)." });
        }

        if (string.IsNullOrWhiteSpace(image.ContentType) || !image.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { success = false, message = "Invalid image file type." });
        }

        try
        {
            using var stream = image.OpenReadStream();
            var description = await _transcriptionService.DescribeImageAsync(stream, image.ContentType, image.FileName);

            if (string.IsNullOrWhiteSpace(description))
            {
                return StatusCode(500, new { success = false, message = "Image description failed: empty result." });
            }

            return Ok(new { success = true, description });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = "Unexpected error during image description.", details = ex.Message });
        }
    }
}

