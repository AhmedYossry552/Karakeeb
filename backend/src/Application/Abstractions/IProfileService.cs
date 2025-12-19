using System.Threading.Tasks;
using Recycling.Application.Contracts.Auth;

namespace Recycling.Application.Abstractions;

public interface IProfileService
{
    Task<ProfileDto?> GetProfileAsync(string userId);
    Task<ProfileDto?> UpdateProfileAsync(string userId, UpdateProfileRequest request);
    Task<bool> DeleteProfileAsync(string userId);
}
