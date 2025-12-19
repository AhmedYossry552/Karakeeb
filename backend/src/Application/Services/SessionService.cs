using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;

namespace Recycling.Application.Services;

public class SessionService : ISessionService
{
    private readonly ISessionRepository _sessionRepository;

    public SessionService(ISessionRepository sessionRepository)
    {
        _sessionRepository = sessionRepository;
    }

    public async Task<string> CreateGuestSessionAsync(string? device, string? ipAddress, string? userAgent)
    {
        var now = DateTime.UtcNow;
        var sessionId = Guid.NewGuid().ToString();

        var session = new Session
        {
            Id = Guid.NewGuid().ToString(),
            UserId = null,
            SessionId = sessionId,
            Device = string.IsNullOrWhiteSpace(device) ? "unknown" : device,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            IsValid = true,
            CreatedAt = now,
            LastUsedAt = now,
            ExpiresAt = now.AddDays(30)
        };

        await _sessionRepository.AddAsync(session);
        return sessionId;
    }

    public async Task<IReadOnlyList<Session>> GetUserSessionsAsync(string userId)
    {
        return await _sessionRepository.GetByUserIdAsync(userId);
    }

    public async Task<bool> InvalidateSessionAsync(string sessionId)
    {
        var session = await _sessionRepository.GetBySessionIdAsync(sessionId);
        if (session == null)
        {
            return false;
        }

        if (!session.IsValid)
        {
            return true;
        }

        session.IsValid = false;
        await _sessionRepository.UpdateAsync(session);
        return true;
    }

    public async Task<bool> UpgradeGuestSessionAsync(string sessionId, string userId)
    {
        var session = await _sessionRepository.GetBySessionIdAsync(sessionId);
        if (session == null)
        {
            return false;
        }

        session.UserId = userId;
        session.LastUsedAt = DateTime.UtcNow;
        await _sessionRepository.UpdateAsync(session);
        return true;
    }
}
