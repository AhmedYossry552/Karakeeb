using System;
using System.Security.Cryptography;
using System.Text;

namespace Recycling.Application.Security;

public static class RefreshTokenHasher
{
    public static string Sha256Hex(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Value is required", nameof(value));
        }

        using var sha = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(value);
        var hash = sha.ComputeHash(bytes);

        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
