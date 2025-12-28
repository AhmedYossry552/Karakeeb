using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Options;
using Recycling.Application.Abstractions;
using Recycling.Application.Options;

namespace Recycling.Infrastructure.Media;

public sealed class CloudinaryImageUploadService : IImageUploadService
{
    private readonly CloudinarySettings _settings;
    private readonly Cloudinary? _cloudinary;

    public bool IsEnabled => _cloudinary != null;

    public CloudinaryImageUploadService(IOptions<CloudinarySettings> settings)
    {
        _settings = settings.Value ?? new CloudinarySettings();

        if (!string.IsNullOrWhiteSpace(_settings.CloudName) &&
            !string.IsNullOrWhiteSpace(_settings.ApiKey) &&
            !string.IsNullOrWhiteSpace(_settings.ApiSecret))
        {
            var account = new Account(_settings.CloudName, _settings.ApiKey, _settings.ApiSecret);
            _cloudinary = new Cloudinary(account)
            {
                Api = { Secure = true }
            };
        }
    }

    public async Task<UploadedImage> UploadImageAsync(
        Stream content,
        string fileName,
        string folder,
        string? contentType = null,
        CancellationToken cancellationToken = default)
    {
        if (_cloudinary == null)
        {
            throw new InvalidOperationException("Cloudinary is not configured.");
        }

        if (content == null)
        {
            throw new ArgumentNullException(nameof(content));
        }

        if (!content.CanRead)
        {
            throw new ArgumentException("Stream is not readable.", nameof(content));
        }

        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(fileName, content),
            Folder = BuildFolder(folder),
            UseFilename = true,
            UniqueFilename = true,
            Overwrite = false
        };

        var uploadResult = await _cloudinary.UploadAsync(uploadParams, cancellationToken);

        if (uploadResult.Error != null)
        {
            throw new InvalidOperationException($"Cloudinary upload failed: {uploadResult.Error.Message}");
        }

        var secureUrl = uploadResult.SecureUrl?.ToString() ?? uploadResult.Url?.ToString();
        if (string.IsNullOrWhiteSpace(secureUrl) || string.IsNullOrWhiteSpace(uploadResult.PublicId))
        {
            throw new InvalidOperationException("Cloudinary upload did not return url/public_id.");
        }

        return new UploadedImage(secureUrl, uploadResult.PublicId);
    }

    private string BuildFolder(string folder)
    {
        var root = (_settings.FolderRoot ?? string.Empty).Trim().Trim('/');
        var sub = (folder ?? string.Empty).Trim().Trim('/');

        if (string.IsNullOrWhiteSpace(root))
        {
            return sub;
        }

        if (string.IsNullOrWhiteSpace(sub))
        {
            return root;
        }

        return $"{root}/{sub}";
    }
}
