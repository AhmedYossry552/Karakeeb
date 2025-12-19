using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface ISubscriberRepository
{
    Task<bool> EmailExistsAsync(string email);
    Task AddAsync(Subscriber subscriber);
}
