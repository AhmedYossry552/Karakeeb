using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Recycling.Application.Abstractions;
using Recycling.Application.Options;

namespace Recycling.Application.Services;

public class ContactService : IContactService
{
    private readonly IEmailSender _emailSender;
    private readonly EmailSettings _emailSettings;

    public ContactService(IEmailSender emailSender, IOptions<EmailSettings> emailOptions)
    {
        _emailSender = emailSender;
        _emailSettings = emailOptions.Value;
    }

    public async Task SendContactMessageAsync(string name, string email, string message)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name is required.", nameof(name));
        if (string.IsNullOrWhiteSpace(email)) throw new ArgumentException("Email is required.", nameof(email));
        if (string.IsNullOrWhiteSpace(message)) throw new ArgumentException("Message is required.", nameof(message));

        var supportEmail = !string.IsNullOrWhiteSpace(_emailSettings.User)
            ? _emailSettings.User
            : _emailSettings.FromAddress;

        if (string.IsNullOrWhiteSpace(supportEmail))
        {
            throw new InvalidOperationException("Support email is not configured.");
        }

        var safeName = System.Net.WebUtility.HtmlEncode(name.Trim());
        var safeEmail = System.Net.WebUtility.HtmlEncode(email.Trim());
        var safeMessage = System.Net.WebUtility.HtmlEncode(message.Trim());

        var subject = $"New Contact Message from {safeName}";

        var htmlBody =
            "<div style=\"font-family:sans-serif;\">" +
            "<h2>New Message from Karakeeb Contact Form</h2>" +
            $"<p><strong>Name:</strong> {safeName}</p>" +
            $"<p><strong>Email:</strong> {safeEmail}</p>" +
            "<p><strong>Message:</strong></p>" +
            "<div style=\"margin-top: 8px; padding: 12px; background-color: #f4f4f4; border-radius: 8px;\">" +
            safeMessage +
            "</div>" +
            "</div>";

        await _emailSender.SendEmailAsync(supportEmail, subject, htmlBody);
    }
}
