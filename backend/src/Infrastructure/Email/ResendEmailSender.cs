using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Recycling.Application.Abstractions;
using Recycling.Application.Options;

namespace Recycling.Infrastructure.Email;

public sealed class ResendEmailSender : IEmailSender
{
    private readonly HttpClient _httpClient;
    private readonly ResendEmailSettings _settings;

    public ResendEmailSender(HttpClient httpClient, IOptions<ResendEmailSettings> options)
    {
        _httpClient = httpClient;
        _settings = options.Value;
    }

    public async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        if (string.IsNullOrWhiteSpace(_settings.ApiKey))
        {
            throw new InvalidOperationException("Resend ApiKey is not configured.");
        }

        if (string.IsNullOrWhiteSpace(_settings.FromAddress))
        {
            throw new InvalidOperationException("Resend FromAddress is not configured.");
        }

        var from = string.IsNullOrWhiteSpace(_settings.FromName)
            ? _settings.FromAddress
            : $"{_settings.FromName} <{_settings.FromAddress}>";

        var payload = new
        {
            from,
            to = new[] { to },
            subject,
            html = htmlBody
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _settings.ApiKey);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        using var response = await _httpClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Resend email send failed: {(int)response.StatusCode} {response.ReasonPhrase}. Body: {body}");
        }
    }
}
