using System;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Recycling.Application.Abstractions;

namespace Recycling.Application.Services;

public class OtpService : IOtpService
{
    private readonly IOtpRepository _otpRepository;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<OtpService> _logger;

    public OtpService(IOtpRepository otpRepository, IEmailSender emailSender, ILogger<OtpService> logger)
    {
        _otpRepository = otpRepository;
        _emailSender = emailSender;
        _logger = logger;
    }

    public async Task CreateAndSendOtpAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email is required", nameof(email));
        }

        var code = GenerateOtp();
        var expiresAt = DateTime.UtcNow.AddHours(1);

        await _otpRepository.UpsertAsync(email, code, expiresAt);

        var subject = "Your OTP Code";
        var html = $@"<div style='font-family: sans-serif;'>
  <h2>OTP Verification</h2>
  <p>Your verification code is:</p>
  <div style='padding: 16px 24px; font-size: 24px; font-weight: bold; border: 1px solid #ccc; border-radius: 8px; background-color: #f9f9f9; color: #2e6c80;'>
    {code}
  </div>
  <p style='margin-top: 16px;'>This code is valid for 1 hour.</p>
  <p style='font-size: 12px; color: #888;'>Tip: You can copy this code and paste it in the app.</p>
</div>";

                try
                {
                        await _emailSender.SendEmailAsync(email, subject, html);
                }
                catch (Exception ex)
                {
                        _logger.LogError(ex, "Failed to send OTP email to {Email}", email);
                        throw new InvalidOperationException("Failed to send OTP email", ex);
                }
    }

    public async Task VerifyOtpAsync(string email, string code)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email is required", nameof(email));
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("OTP code is required", nameof(code));
        }

        var otp = await _otpRepository.GetByEmailAndCodeAsync(email, code);
        if (otp == null || otp.ExpiresAt < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Invalid or expired OTP");
        }

        await _otpRepository.DeleteAsync(otp);
    }

    private static string GenerateOtp()
    {
        // 6-digit numeric OTP similar to Node implementation
        var bytes = new byte[4];
        RandomNumberGenerator.Fill(bytes);
        var value = BitConverter.ToUInt32(bytes, 0) % 900000 + 100000;
        return value.ToString();
    }
}
