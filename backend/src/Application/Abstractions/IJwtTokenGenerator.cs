using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}
