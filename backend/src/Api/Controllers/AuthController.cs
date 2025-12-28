using System.Security.Claims;
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
    private readonly IUserRepository _userRepository;
    private readonly IWalletService _walletService;

    public AuthController(IAuthService authService, IUserRepository userRepository, IWalletService walletService)
    {
        _authService = authService;
        _userRepository = userRepository;
        _walletService = walletService;
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
            Secure = HttpContext.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(7),
            Path = "/"
        };

        Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
    }

    private void ClearRefreshTokenCookie()
    {
        // Match the cookie path used when setting it.
        Response.Cookies.Delete("refreshToken", new CookieOptions
        {
            Path = "/",
            SameSite = SameSiteMode.Lax
        });

        // Extra safety for some clients: overwrite with expired cookie.
        Response.Cookies.Append("refreshToken", string.Empty, new CookieOptions
        {
            HttpOnly = true,
            Secure = HttpContext.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(-1),
            Path = "/"
        });
    }

    private void ClearSessionCookie()
    {
        Response.Cookies.Delete("sessionId", new CookieOptions
        {
            Path = "/",
            SameSite = SameSiteMode.Lax
        });

        Response.Cookies.Append("sessionId", string.Empty, new CookieOptions
        {
            HttpOnly = true,
            Secure = HttpContext.Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(-1),
            Path = "/"
        });
    }

    // POST /api/auth/logout
    // Revokes refresh token in DB (if present) and clears cookies.
    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout()
    {
        string? cookieRefreshToken = null;
        if (Request.Cookies.TryGetValue("refreshToken", out var refreshToken) && !string.IsNullOrWhiteSpace(refreshToken))
        {
            cookieRefreshToken = refreshToken;
        }

        if (!string.IsNullOrWhiteSpace(cookieRefreshToken))
        {
            var user = await _userRepository.GetByRefreshTokenAsync(cookieRefreshToken);
            if (user != null && !string.IsNullOrWhiteSpace(user.RefreshToken))
            {
                user.RefreshToken = null;
                user.UpdatedAt = DateTime.UtcNow;
                await _userRepository.UpdateAsync(user);
            }
        }
        else
        {
            // Fallback: if bearer token is present, revoke by user id.
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrWhiteSpace(userId))
            {
                var user = await _userRepository.GetByIdAsync(userId);
                if (user != null && !string.IsNullOrWhiteSpace(user.RefreshToken))
                {
                    user.RefreshToken = null;
                    user.UpdatedAt = DateTime.UtcNow;
                    await _userRepository.UpdateAsync(user);
                }
            }
        }

        ClearRefreshTokenCookie();
        ClearSessionCookie();

        return Ok(new { message = "Logged out" });
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
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
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
