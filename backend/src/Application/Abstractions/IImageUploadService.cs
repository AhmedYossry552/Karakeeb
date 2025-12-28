namespace Recycling.Application.Abstractions;

public sealed record UploadedImage(string SecureUrl, string PublicId);

public interface IImageUploadService
{
    bool IsEnabled { get; }

    Task<UploadedImage> UploadImageAsync(
        Stream content,
        string fileName,
        string folder,
        string? contentType = null,
        CancellationToken cancellationToken = default);
}
