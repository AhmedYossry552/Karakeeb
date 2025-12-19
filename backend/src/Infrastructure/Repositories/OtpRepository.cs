using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class OtpRepository : IOtpRepository
{
    private readonly RecyclingDbContext _context;

    public OtpRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public Task<Otp?> GetByEmailAndCodeAsync(string email, string code)
    {
        return _context.Otps.SingleOrDefaultAsync(o => o.Email == email && o.Code == code);
    }

    public async Task UpsertAsync(string email, string code, DateTime expiresAt)
    {
        var existing = await _context.Otps.SingleOrDefaultAsync(o => o.Email == email);
        if (existing == null)
        {
            existing = new Otp
            {
                Id = Guid.NewGuid().ToString(),
                Email = email,
                Code = code,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = expiresAt,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Otps.Add(existing);
        }
        else
        {
            existing.Code = code;
            existing.ExpiresAt = expiresAt;
            existing.UpdatedAt = DateTime.UtcNow;
            _context.Otps.Update(existing);
        }

        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(Otp otp)
    {
        _context.Otps.Remove(otp);
        await _context.SaveChangesAsync();
    }
}
