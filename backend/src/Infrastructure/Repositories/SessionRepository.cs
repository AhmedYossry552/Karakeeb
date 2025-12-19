using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class SessionRepository : ISessionRepository
{
    private readonly RecyclingDbContext _context;

    public SessionRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Session session)
    {
        _context.Sessions.Add(session);
        await _context.SaveChangesAsync();
    }

    public async Task<Session?> GetBySessionIdAsync(string sessionId)
    {
        return await _context.Sessions
            .FirstOrDefaultAsync(s => s.SessionId == sessionId);
    }

    public async Task<IReadOnlyList<Session>> GetByUserIdAsync(string userId)
    {
        return await _context.Sessions
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task UpdateAsync(Session session)
    {
        _context.Sessions.Update(session);
        await _context.SaveChangesAsync();
    }
}
