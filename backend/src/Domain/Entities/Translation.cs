using System;

namespace Recycling.Domain.Entities;

public class Translation
{
    public string Id { get; set; } = null!;
    public string TranslationKey { get; set; } = null!;
    public string? ReferenceId { get; set; }
    public string? Type { get; set; }
    public string? TranslationEn { get; set; }
    public string? TranslationAr { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
