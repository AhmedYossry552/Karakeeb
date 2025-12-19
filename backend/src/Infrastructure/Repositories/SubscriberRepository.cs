using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Infrastructure.Repositories;

public class SubscriberRepository : ISubscriberRepository
{
    private readonly RecyclingDbContext _context;

    public SubscriberRepository(RecyclingDbContext context)
    {
        _context = context;
    }

    public Task<bool> EmailExistsAsync(string email)
    {
        return _context.Subscribers.AnyAsync(s => s.Email == email);
    }

    public async Task AddAsync(Subscriber subscriber)
    {
        _context.Subscribers.Add(subscriber);
        await _context.SaveChangesAsync();
    }
}
