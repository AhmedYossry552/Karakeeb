using System.Threading.Tasks;

namespace Recycling.Application.Abstractions;

public interface IContactService
{
    Task SendContactMessageAsync(string name, string email, string message);
}
