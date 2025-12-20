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

    public async Task<string> ExtractMaterialsFromTextAsync(string transcription, string materialList)
    {
        if (string.IsNullOrWhiteSpace(transcription))
        {
            throw new ArgumentException("Transcription is required.", nameof(transcription));
        }

        if (string.IsNullOrWhiteSpace(materialList))
        {
            throw new ArgumentException("Material list is required.", nameof(materialList));
        }

        var systemPrompt = $@"
You are a professional AI assistant for a recycling app. Extract a list of materials, their quantities, and units from noisy, possibly misspelled, Arabic or English input.

The input text can be either:
- A free-form speech transcription from the user.
- A paragraph describing an image that contains recyclable items.

Rules:
- CRITICAL: Only return valid JSON in this exact format:
{{
  \"items\": [
    {{
      \"material\": \"English name here\",
      \"quantity\": float,
      \"unit\": \"KG\" | \"pieces\"
    }}
  ]
}}
- If you do not follow this, the system will fail.
- Only use materials from the provided list (see below). If a material is not in the list, ignore it.
- If a material appears multiple times with different phrases (e.g., \"2 laptop\" and \"3 motherboard laptop\"), treat them as SEPARATE items only if they are genuinely different materials.
- If the same material is mentioned multiple times (e.g., \"2 laptop\" and \"1 laptop\"), merge them by summing their quantities.
- For each material, use the canonical English name from the list.
- If the unit is missing or ambiguous, use the default unit for that material from the list.
- Accept both Arabic and English names, and be robust to typos and variants.
- If the quantity is missing, assume 1.
- Accept both singular and plural units (\"piece\", \"pieces\", \"KG\").
- Do not output any explanation, only the JSON object.

Material List (English name, Arabic name, unit):
{materialList}
";

        var payload = new
        {
            model = "llama-3.1-8b-instant",
            temperature = 0.25,
            response_format = new { type = "json_object" },
            messages = new object[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = $"Input: {transcription}" }
            }
        };

        var json = JsonSerializer.Serialize(payload);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var response = await _httpClient.PostAsync("/openai/v1/chat/completions", content);
        var jsonString = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(
                $"Groq material extraction failed with status {(int)response.StatusCode} {response.ReasonPhrase}. Response: {jsonString}");
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

        throw new InvalidOperationException("Groq material extraction response did not contain a valid 'message.content' field.");
    }
}
