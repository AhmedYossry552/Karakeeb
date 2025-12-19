using System;
using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;

namespace Recycling.Application.Services;

public class SubscriberService : ISubscriberService
{
    private readonly ISubscriberRepository _subscriberRepository;
    private readonly IEmailSender _emailSender;

    public SubscriberService(ISubscriberRepository subscriberRepository, IEmailSender emailSender)
    {
        _subscriberRepository = subscriberRepository;
        _emailSender = emailSender;
    }

    public async Task<bool> SubscribeAsync(string email, string? name)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new ArgumentException("Email is required.", nameof(email));
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();

        if (await _subscriberRepository.EmailExistsAsync(normalizedEmail))
        {
            return false;
        }

        var subscriber = new Subscriber
        {
            Id = Guid.NewGuid().ToString(),
            Email = normalizedEmail,
            SubscribedAt = DateTime.UtcNow
        };

        await _subscriberRepository.AddAsync(subscriber);

        try
        {
            var displayName = string.IsNullOrWhiteSpace(name) ? "there" : name!.Trim();
            var subject = "Thank you for subscribing!";
            var htmlBody =
                "<div style=\"font-family: sans-serif;\">" +
                "<h2>Thank you for subscribing!</h2>" +
                $"<p>Hi {System.Net.WebUtility.HtmlEncode(displayName)},</p>" +
                "<p>We're excited to have you on board. You'll now receive our latest updates and news.</p>" +
                "<p style=\"margin-top: 16px;\">If you have any questions, feel free to reply to this email.</p>" +
                "<p style=\"font-size: 12px; color: #888;\">Best regards,<br/>Recycle App Team</p>" +
                "</div>";

            await _emailSender.SendEmailAsync(normalizedEmail, subject, htmlBody);
        }
        catch
        {
            // Ignore email sending failures; the subscription itself is still valid.
        }

        return true;
    }
}
