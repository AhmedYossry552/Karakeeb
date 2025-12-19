using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface ISessionService
{
    Task<string> CreateGuestSessionAsync(string? device, string? ipAddress, string? userAgent);
    Task<IReadOnlyList<Session>> GetUserSessionsAsync(string userId);
    Task<bool> InvalidateSessionAsync(string sessionId);
    Task<bool> UpgradeGuestSessionAsync(string sessionId, string userId);
}
