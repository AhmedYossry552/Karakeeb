using System.Threading.Tasks;

namespace Recycling.Application.Abstractions;

public interface ISubscriberService
{
    Task<bool> SubscribeAsync(string email, string? name);
}
