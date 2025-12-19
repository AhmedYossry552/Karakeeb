using System.Threading.Tasks;

namespace Recycling.Application.Abstractions;

public interface IEmailSender
{
    Task SendEmailAsync(string to, string subject, string htmlBody);
}
