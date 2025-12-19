using System;
using System.Threading.Tasks;
using Google.Apis.Auth;
using Microsoft.Extensions.Options;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Auth;
using Recycling.Application.Options;
using Recycling.Domain.Entities;

namespace Recycling.Application.Services;

public class AuthService : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IBuyerProfileRepository _buyerProfileRepository;
    private readonly IDeliveryProfileRepository _deliveryProfileRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IOtpService _otpService;
    private readonly GoogleAuthSettings _googleSettings;

    public AuthService(
        IUserRepository userRepository,
        IBuyerProfileRepository buyerProfileRepository,
        IDeliveryProfileRepository deliveryProfileRepository,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator,
        IOtpService otpService,
        IOptions<GoogleAuthSettings> googleOptions)
    {
        _userRepository = userRepository;
        _buyerProfileRepository = buyerProfileRepository;
        _deliveryProfileRepository = deliveryProfileRepository;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
        _otpService = otpService;
        _googleSettings = googleOptions.Value;
    }

    private static string GenerateRefreshToken()
    {
        return Guid.NewGuid().ToString("N");
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var emailExists = await _userRepository.EmailExistsAsync(request.Email);
        if (emailExists)
        {
            throw new InvalidOperationException("Email already exists");
        }

        // Determine if this is a Google-based signup or normal email/password signup
        var isGoogleSignup = string.Equals(request.Provider, "google", StringComparison.OrdinalIgnoreCase);

        string? passwordHash = null;
        string? imgUrl = request.ImgUrl;
        string provider = request.Provider ?? "none";

        if (isGoogleSignup)
        {
            if (string.IsNullOrWhiteSpace(request.IdToken))
            {
                throw new ArgumentException("Google ID token is required for Google signup", nameof(request.IdToken));
            }

            // Reuse the same audience settings as GoogleCheckFirstTimeAsync
            var audiences = new[]
            {
                _googleSettings.WebClientId,
                _googleSettings.AndroidClientId,
                _googleSettings.MobileWebClientId
            };

            if (audiences.Length == 0 || string.IsNullOrWhiteSpace(audiences[0]))
            {
                throw new InvalidOperationException("Google client IDs are not configured.");
            }

            var validationSettings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = audiences
            };

            GoogleJsonWebSignature.Payload payload;
            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, validationSettings);
            }
            catch (Exception ex)
            {
                throw new ArgumentException("Invalid Google token", ex);
            }

            if (payload == null || string.IsNullOrWhiteSpace(payload.Email))
            {
                throw new ArgumentException("Invalid Google token");
            }

            // Ensure the email used for signup matches the Google account
            if (!string.Equals(payload.Email, request.Email, StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Email does not match Google account");
            }

            // Prefer Google's name and picture when available
            if (string.IsNullOrWhiteSpace(request.Name) && !string.IsNullOrWhiteSpace(payload.Name))
            {
                request.Name = payload.Name;
            }

            if (string.IsNullOrWhiteSpace(imgUrl) && !string.IsNullOrWhiteSpace(payload.Picture))
            {
                imgUrl = payload.Picture;
            }

            provider = "google";
            // passwordHash remains null for Google users (no local password login)
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.Password))
            {
                throw new ArgumentException("Password is required", nameof(request.Password));
            }
            if (string.IsNullOrWhiteSpace(request.OtpCode))
            {
                throw new ArgumentException("OTP code is required for signup", nameof(request.OtpCode));
            }

            await _otpService.VerifyOtpAsync(request.Email, request.OtpCode);

            passwordHash = _passwordHasher.Hash(request.Password);
        }

        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name,
            Email = request.Email,
            Password = passwordHash,
            PhoneNumber = request.PhoneNumber,
            Provider = provider,
            Role = request.Role,
            TotalPoints = 0,
            IsApproved = request.Role == "customer" || request.Role == "buyer",
            ImgUrl = imgUrl,
            RefreshToken = GenerateRefreshToken(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _userRepository.AddAsync(user);

        if (string.Equals(request.Role, "buyer", StringComparison.OrdinalIgnoreCase) &&
            request.Attachments != null)
        {
            var a = request.Attachments;

            if (string.IsNullOrWhiteSpace(a.BusinessName) ||
                string.IsNullOrWhiteSpace(a.BusinessType) ||
                string.IsNullOrWhiteSpace(a.BusinessAddress) ||
                string.IsNullOrWhiteSpace(a.BusinessLicense) ||
                string.IsNullOrWhiteSpace(a.TaxId) ||
                string.IsNullOrWhiteSpace(a.EstimatedMonthlyVolume))
            {
                throw new InvalidOperationException("Missing buyer business information");
            }

            var buyerProfile = new BuyerProfile
            {
                UserId = user.Id,
                BusinessName = a.BusinessName!,
                BusinessType = a.BusinessType,
                BusinessAddress = a.BusinessAddress,
                BusinessLicense = a.BusinessLicense,
                TaxId = a.TaxId,
                EstimatedMonthlyVolume = a.EstimatedMonthlyVolume
            };

            await _buyerProfileRepository.AddAsync(buyerProfile);
        }

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new AuthResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            Token = token,
            PhoneNumber = user.PhoneNumber,
            Provider = user.Provider,
            IsApproved = user.IsApproved,
            ImgUrl = user.ImgUrl,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            LastActiveAt = user.LastActiveAt,
            RefreshToken = user.RefreshToken
        };
    }

    public async Task InitiateSignupAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email is required", nameof(email));
        }

        var exists = await _userRepository.EmailExistsAsync(email);
        if (exists)
        {
            throw new InvalidOperationException("Email already exists");
        }

        await _otpService.CreateAndSendOtpAsync(email);
    }

    public async Task<AuthResponse> RegisterDeliveryAsync(RegisterDeliveryRequest request)
    {
        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ArgumentException("Email is required", nameof(request.Email));
        }

        var emailExists = await _userRepository.EmailExistsAsync(request.Email);
        if (emailExists)
        {
            throw new InvalidOperationException("Email already exists");
        }

        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.LicenseNumber) ||
            string.IsNullOrWhiteSpace(request.VehicleType))
        {
            throw new InvalidOperationException("Missing required delivery information");
        }

        var user = new User
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name,
            Email = request.Email,
            Password = _passwordHasher.Hash(request.Password),
            PhoneNumber = request.PhoneNumber,
            Provider = request.Provider,
            Role = "delivery",
            TotalPoints = 0,
            IsApproved = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            RefreshToken = GenerateRefreshToken()
        };

        await _userRepository.AddAsync(user);

        var profile = new DeliveryProfile
        {
            UserId = user.Id,
            LicenseNumber = request.LicenseNumber,
            VehicleType = request.VehicleType,
            NationalId = request.NationalId,
            EmergencyContact = request.EmergencyContact,
            DeliveryImage = request.DeliveryImage,
            VehicleImage = request.VehicleImage,
            CriminalRecord = request.CriminalRecord,
            Status = "pending"
        };

        await _deliveryProfileRepository.AddAsync(profile);

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new AuthResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            Token = token,
            RefreshToken = user.RefreshToken
        };
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userRepository.GetByEmailAsync(request.Email);
        if (user is null || string.IsNullOrEmpty(user.Password) ||
            !_passwordHasher.Verify(user.Password, request.Password))
        {
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        if (string.Equals(user.Role, "delivery", StringComparison.OrdinalIgnoreCase) &&
            !user.IsApproved)
        {
            throw new UnauthorizedAccessException("Delivery Not Approved Yet");
        }

        var token = _jwtTokenGenerator.GenerateToken(user);
        var refreshToken = GenerateRefreshToken();

        user.RefreshToken = refreshToken;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);

        return new AuthResponse
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role,
            Token = token,
            PhoneNumber = user.PhoneNumber,
            Provider = user.Provider,
            IsApproved = user.IsApproved,
            ImgUrl = user.ImgUrl,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            LastActiveAt = user.LastActiveAt,
            RefreshToken = refreshToken
        };
    }

    public async Task<GoogleProviderResponse> GoogleCheckFirstTimeAsync(GoogleProviderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken))
        {
            throw new ArgumentException("Missing Google ID token", nameof(request.IdToken));
        }

        var audiences = new[]
        {
            _googleSettings.WebClientId,
            _googleSettings.AndroidClientId,
            _googleSettings.MobileWebClientId
        };

        if (audiences.Length == 0 || string.IsNullOrWhiteSpace(audiences[0]))
        {
            throw new InvalidOperationException("Google client IDs are not configured.");
        }

        var validationSettings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = audiences
        };

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, validationSettings);
        }
        catch (Exception ex)
        {
            throw new ArgumentException("Invalid Google token", ex);
        }

        if (payload == null || string.IsNullOrWhiteSpace(payload.Email))
        {
            throw new ArgumentException("Invalid Google token");
        }

        var email = payload.Email;
        var name = payload.Name ?? string.Empty;
        var picture = payload.Picture;

        var existingUser = await _userRepository.GetByEmailAsync(email);

        if (existingUser != null)
        {
            if (string.Equals(existingUser.Role, "delivery", StringComparison.OrdinalIgnoreCase) &&
                !existingUser.IsApproved)
            {
                throw new UnauthorizedAccessException("Delivery Not Approved Yet");
            }

            var accessToken = _jwtTokenGenerator.GenerateToken(existingUser);
            var refreshToken = GenerateRefreshToken();

            existingUser.RefreshToken = refreshToken;
            existingUser.UpdatedAt = DateTime.UtcNow;

            await _userRepository.UpdateAsync(existingUser);

            return new GoogleProviderResponse
            {
                Exists = true,
                User = new GoogleUserInfoDto
                {
                    Id = existingUser.Id,
                    Email = existingUser.Email,
                    Name = existingUser.Name,
                    Image = existingUser.ImgUrl ?? picture,
                    Role = existingUser.Role,
                    Provider = string.IsNullOrWhiteSpace(existingUser.Provider) ? "google" : existingUser.Provider!,
                    IsApproved = existingUser.IsApproved
                },
                AccessToken = accessToken,
                RefreshToken = refreshToken
            };
        }

        return new GoogleProviderResponse
        {
            Exists = false,
            User = new GoogleUserInfoDto
            {
                Id = null,
                Email = email,
                Name = name,
                Image = picture,
                Role = "customer",
                Provider = "google",
                IsApproved = false
            }
        };
    }

    public async Task<string> RefreshAccessTokenAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new InvalidOperationException("No refresh token provided");
        }

        var user = await _userRepository.GetByRefreshTokenAsync(refreshToken);
        if (user == null)
        {
            throw new InvalidOperationException("Invalid refresh token");
        }

        if (string.Equals(user.Role, "delivery", StringComparison.OrdinalIgnoreCase) &&
            !user.IsApproved)
        {
            throw new UnauthorizedAccessException("Delivery Not Approved Yet");
        }

        var token = _jwtTokenGenerator.GenerateToken(user);

        return token;
    }

    public async Task ForgotPasswordAsync(ForgotPasswordRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ArgumentException("Email is required", nameof(request.Email));
        }

        var user = await _userRepository.GetByEmailAsync(request.Email);
        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

        if (string.Equals(user.Provider, "google", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Cannot reset password for Google user");
        }

        await _otpService.CreateAndSendOtpAsync(request.Email);
    }

    public async Task ResetPasswordAsync(ResetPasswordRequest request)
    {
        if (request == null)
        {
            throw new ArgumentNullException(nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            throw new ArgumentException("Email is required", nameof(request.Email));
        }

        if (string.IsNullOrWhiteSpace(request.OtpCode))
        {
            throw new ArgumentException("OTP code is required", nameof(request.OtpCode));
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            throw new ArgumentException("New password is required", nameof(request.NewPassword));
        }

        await _otpService.VerifyOtpAsync(request.Email, request.OtpCode);

        var user = await _userRepository.GetByEmailAsync(request.Email);
        if (user == null)
        {
            throw new InvalidOperationException("User not found");
        }

        if (string.Equals(user.Provider, "google", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Cannot reset password for Google user");
        }

        user.Password = _passwordHasher.Hash(request.NewPassword);
        user.RefreshToken = null;
        user.UpdatedAt = DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);
    }
}
