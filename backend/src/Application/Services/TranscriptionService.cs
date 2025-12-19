using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace Recycling.Application.Services;

public class TranscriptionService
{
    private readonly string _apiKey;
    private readonly HttpClient _httpClient;

    public TranscriptionService(IConfiguration config)
    {
        // Try to read API key from configuration first
        _apiKey = config["GROQ_API_KEY"] ??
                  Environment.GetEnvironmentVariable("GROQ_API_KEY") ??
                  throw new InvalidOperationException("GROQ_API_KEY is not configured. Please set it in appsettings.json or as an environment variable.");
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri("https://api.groq.com")
        };
        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", _apiKey);
    }

    public async Task<string?> TranscribeAudioAsync(Stream audioStream, string contentType, string fileName, string language = "ar")
    {
        var form = new MultipartFormDataContent();

        var fileContent = new StreamContent(audioStream);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);

        form.Add(fileContent, "file", fileName);
        form.Add(new StringContent("whisper-large-v3"), "model");
        form.Add(new StringContent(language), "language");
        form.Add(new StringContent("json"), "response_format");

        using var response = await _httpClient.PostAsync("/openai/v1/audio/transcriptions", form);
        var jsonString = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Groq transcription API failed with status {(int)response.StatusCode} {response.ReasonPhrase}. Response: {jsonString}");
        }

        using var document = JsonDocument.Parse(jsonString);
        if (document.RootElement.TryGetProperty("text", out var textElement))
        {
            return textElement.GetString();
        }

        throw new InvalidOperationException("Groq transcription response did not contain a 'text' field.");
    }

    public async Task<string> DescribeImageAsync(Stream imageStream, string contentType, string fileName)
    {
        // Read image into memory and convert to base64 data URL
        using var ms = new MemoryStream();
        await imageStream.CopyToAsync(ms);
        var bytes = ms.ToArray();
        var base64 = Convert.ToBase64String(bytes);
        var dataUrl = $"data:{contentType};base64,{base64}";

        var systemPrompt =
            "You are a vision assistant for a recycling app. " +
            "Look at the provided image and describe ONLY the recyclable items you see " +
            "(such as plastic bottles, cardboard boxes, metal cans, electronic devices, furniture, etc.). " +
            "Mention approximate counts or quantities when they are clearly visible. " +
            "Respond in a single concise paragraph. Do not output JSON.";

        var payload = new
        {
            model = "meta-llama/llama-4-scout-17b-16e-instruct",
            temperature = 0.3,
            messages = new object[]
            {
                new
                {
                    role = "system",
                    content = systemPrompt
                },
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new
                        {
                            type = "text",
                            text = "Describe the recyclable items you see in this image."
                        },
                        new
                        {
                            type = "image_url",
                            image_url = new
                            {
                                url = dataUrl
                            }
                        }
                    }
                }
            }
        };

        var json = JsonSerializer.Serialize(payload);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var response = await _httpClient.PostAsync("/openai/v1/chat/completions", content);
        var jsonString = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Groq vision API failed with status {(int)response.StatusCode} {response.ReasonPhrase}. Response: {jsonString}");
        }

        using var document = JsonDocument.Parse(jsonString);
        if (document.RootElement.TryGetProperty("choices", out var choicesElement) &&
            choicesElement.ValueKind == JsonValueKind.Array &&
            choicesElement.GetArrayLength() > 0)
        {
            var firstChoice = choicesElement[0];
            if (firstChoice.TryGetProperty("message", out var messageElement) &&
                messageElement.TryGetProperty("content", out var contentElement) &&
                contentElement.ValueKind == JsonValueKind.String)
            {
                return contentElement.GetString() ?? string.Empty;
            }
        }

        throw new InvalidOperationException("Groq vision response did not contain a valid 'message.content' field.");
    }
}
