using System.Threading.Tasks;

namespace Recycling.Application.Abstractions;

public interface IOtpService
{
    Task CreateAndSendOtpAsync(string email);
    Task VerifyOtpAsync(string email, string code);
}
