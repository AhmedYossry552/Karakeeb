using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Application.Security;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class UserRepository : IUserRepository
{
    private readonly RecyclingDbContext _context;

    public UserRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public Task<User?> GetByEmailAsync(string email)
    {
        return _context.Users.SingleOrDefaultAsync(u => u.Email == email);
    }

    public Task<User?> GetByIdAsync(string id)
    {
        return _context.Users.FindAsync(id).AsTask();
    }

    public Task<User?> GetByRefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return Task.FromResult<User?>(null);
        }

        // New format stores SHA-256 hash of the refresh token; legacy stored plaintext.
        var hashed = RefreshTokenHasher.Sha256Hex(refreshToken);
        return _context.Users.SingleOrDefaultAsync(u => u.RefreshToken == hashed || u.RefreshToken == refreshToken);
    }

    public async Task AddAsync(User user)
    {
        _context.Users.Add(user);
        await _context.SaveChangesAsync();
    }

    public Task<bool> EmailExistsAsync(string email)
    {
        return _context.Users.AnyAsync(u => u.Email == email);
    }

    public async Task UpdateAsync(User user)
    {
        _context.Users.Update(user);
        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<User>> GetByIdsAsync(IReadOnlyList<string> ids)
    {
        if (ids == null || ids.Count == 0)
        {
            return Array.Empty<User>();
        }

        return await _context.Users
            .Where(u => ids.Contains(u.Id))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<User>> GetTopByTotalPointsAsync(int limit)
    {
        if (limit < 1)
        {
            limit = 10;
        }

        return await _context.Users
            .Where(u => u.TotalPoints > 0)
            .OrderByDescending(u => u.TotalPoints)
            .Take(limit)
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<IReadOnlyList<User>> GetByRoleAsync(string role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return Array.Empty<User>();
        }

        return await _context.Users
            .Where(u => u.Role == role)
            .AsNoTracking()
            .ToListAsync();
    }
}
