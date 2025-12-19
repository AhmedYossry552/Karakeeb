using System.Threading.Tasks;
using Recycling.Application.Contracts.Auth;

namespace Recycling.Application.Abstractions;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<GoogleProviderResponse> GoogleCheckFirstTimeAsync(GoogleProviderRequest request);
    Task<string> RefreshAccessTokenAsync(string refreshToken);
    Task ForgotPasswordAsync(ForgotPasswordRequest request);
    Task ResetPasswordAsync(ResetPasswordRequest request);
    Task<AuthResponse> RegisterDeliveryAsync(RegisterDeliveryRequest request);
    Task InitiateSignupAsync(string email);
}
