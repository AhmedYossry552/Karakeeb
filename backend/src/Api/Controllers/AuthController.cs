using System.Security.Claims;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Auth;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IWalletService _walletService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, IWalletService walletService, ILogger<AuthController> logger)
    {
        _authService = authService;
        _walletService = walletService;
        _logger = logger;
    }

    private void SetRefreshTokenCookie(string? refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return;
        }

        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = false,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(7),
            Path = "/"
        };

        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }

    // GET /api/auth/validate
    // Validates the current access token and returns basic user info,
    // mirroring the Node.js validateToken endpoint.
    [HttpGet("validate")]
    [Authorize]
    public IActionResult Validate()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = User.FindFirstValue(ClaimTypes.Role);

        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized(new { message = "Invalid access token" });
        }

        return Ok(new
        {
            message = "Access token is valid",
            user = new
            {
                userId,
                role
            }
        });
    }

    [HttpPost("initiateSignup")]
    public async Task<IActionResult> InitiateSignup([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            await _authService.InitiateSignupAsync(request.Email);
            return Ok(new { message = "OTP sent to your email" });
        }
        catch (InvalidOperationException ex)
        {
            // Preserve previous behavior for known business rule
            if (string.Equals(ex.Message, "Email already exists", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { message = ex.Message });
            }

            _logger.LogError(ex, "InitiateSignup failed for email {Email}", request.Email);
            return StatusCode(500, new { message = "Failed to send OTP email" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "InitiateSignup crashed for email {Email}", request.Email);
            return StatusCode(500, new { message = "Signup initiation failed" });
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var response = await _authService.RegisterAsync(request);
            SetRefreshTokenCookie(response.RefreshToken);

            decimal balance = 0;
            try
            {
                balance = await _walletService.GetUserBalanceAsync(response.Id);
            }
            catch
            {
                // Ignore wallet errors during auth
            }

            var user = new
            {
                _id = response.Id,
                name = response.Name,
                email = response.Email,
                phoneNumber = response.PhoneNumber,
                provider = response.Provider ?? "none",
                role = response.Role,
                isApproved = response.IsApproved,
                imgUrl = response.ImgUrl,
                createdAt = response.CreatedAt,
                updatedAt = response.UpdatedAt,
                lastActiveAt = response.LastActiveAt,
                attachments = new
                {
                    balance
                }
            };

            return Ok(new { user, accessToken = response.Token });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var response = await _authService.LoginAsync(request);
            SetRefreshTokenCookie(response.RefreshToken);

            decimal balance = 0;
            try
            {
                balance = await _walletService.GetUserBalanceAsync(response.Id);
            }
            catch
            {
                // Ignore wallet errors during auth
            }

            var user = new
            {
                _id = response.Id,
                name = response.Name,
                email = response.Email,
                phoneNumber = response.PhoneNumber,
                provider = response.Provider ?? "none",
                role = response.Role,
                isApproved = response.IsApproved,
                imgUrl = response.ImgUrl,
                createdAt = response.CreatedAt,
                updatedAt = response.UpdatedAt,
                lastActiveAt = response.LastActiveAt,
                attachments = new { }
            };

            return Ok(new { user, accessToken = response.Token });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("provider/google")]
    public async Task<IActionResult> GoogleProvider([FromBody] GoogleProviderRequest request)
    {
        try
        {
            var result = await _authService.GoogleCheckFirstTimeAsync(request);
            if (result.Exists)
            {
                SetRefreshTokenCookie(result.RefreshToken);
            }
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("forgotPassword")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        try
        {
            await _authService.ForgotPasswordAsync(request);
            return Ok(new { message = "OTP sent to your email" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("resetPassword")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        try
        {
            await _authService.ResetPasswordAsync(request);
            return Ok(new { message = "Password updated successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        if (!Request.Cookies.TryGetValue("refreshToken", out var refreshToken) || string.IsNullOrWhiteSpace(refreshToken))
        {
            return Unauthorized(new { message = "No refresh token" });
        }

        try
        {
            var accessToken = await _authService.RefreshAccessTokenAsync(refreshToken);
            return Ok(new { accessToken });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
    }

    [HttpGet("/auth/refresh")]
    public Task<IActionResult> LegacyRefresh()
    {
        return Refresh();
    }
}
