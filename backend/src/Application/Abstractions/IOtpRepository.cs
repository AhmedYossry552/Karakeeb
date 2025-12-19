using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface IOtpRepository
{
    Task<Otp?> GetByEmailAndCodeAsync(string email, string code);
    Task UpsertAsync(string email, string code, System.DateTime expiresAt);
    Task DeleteAsync(Otp otp);
}
