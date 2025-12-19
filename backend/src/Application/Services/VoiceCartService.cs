using System.Text.RegularExpressions;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Cart;
using Recycling.Domain.Entities;

namespace Recycling.Application.Services;

public class VoiceCartService
{
    private readonly TranscriptionService _transcriptionService;
    private readonly ICartService _cartService;
    private readonly IItemRepository _itemRepository;
    private readonly ICategoryRepository _categoryRepository;

    public VoiceCartService(
        TranscriptionService transcriptionService,
        ICartService cartService,
        IItemRepository itemRepository,
        ICategoryRepository categoryRepository)
    {
        _transcriptionService = transcriptionService;
        _cartService = cartService;
        _itemRepository = itemRepository;
        _categoryRepository = categoryRepository;
    }

    public class RecognizedVoiceItem
    {
        public string ItemId { get; set; } = null!;
        public string ItemNameEn { get; set; } = null!;
        public string ItemNameAr { get; set; } = null!;
        public string CategoryNameEn { get; set; } = string.Empty;
        public string CategoryNameAr { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Unit { get; set; } = string.Empty;
        public string MatchText { get; set; } = string.Empty;
    }

    public class VoiceCartResult
    {
        public string Transcription { get; set; } = string.Empty;
        public IReadOnlyList<RecognizedVoiceItem> Items { get; set; } = Array.Empty<RecognizedVoiceItem>();
        public CartDto Cart { get; set; } = new CartDto();
    }

    public async Task<VoiceCartResult> ProcessVoiceToCartAsync(
        string userId,
        Stream audioStream,
        string contentType,
        string fileName,
        string language = "ar")
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("UserId is required", nameof(userId));
        }

        var transcription = await _transcriptionService.TranscribeAudioAsync(audioStream, contentType, fileName, language)
                             ?? string.Empty;

        if (string.IsNullOrWhiteSpace(transcription))
        {
            throw new InvalidOperationException("Transcription result is empty.");
        }

        var normalizedText = transcription.ToLowerInvariant();

        // Load all items (paged) so we can try to match by name
        var allItems = new List<Item>();
        const int pageSize = 200;
        var page = 1;
        while (true)
        {
            var (items, total) = await _itemRepository.GetPagedAsync(page, pageSize);
            if (items.Count == 0)
            {
                break;
            }

            allItems.AddRange(items);

            var loaded = page * pageSize;
            if (loaded >= total)
            {
                break;
            }

            page++;
        }

        var recognized = new List<RecognizedVoiceItem>();

        foreach (var item in allItems)
        {
            var nameEn = item.NameEn?.ToLowerInvariant() ?? string.Empty;
            var nameAr = item.NameAr?.ToLowerInvariant() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(nameEn) && string.IsNullOrWhiteSpace(nameAr))
            {
                continue;
            }

            var matchIndex = FindNameIndex(normalizedText, nameEn, nameAr);
            if (matchIndex < 0)
            {
                continue;
            }

            var window = GetWindowAround(normalizedText, matchIndex, 40);
            var (quantity, unit) = ExtractQuantityAndUnit(window);

            if (quantity <= 0)
            {
                quantity = 1; // default minimal quantity
            }

            recognized.Add(new RecognizedVoiceItem
            {
                ItemId = item.Id,
                ItemNameEn = item.NameEn,
                ItemNameAr = item.NameAr,
                Quantity = quantity,
                Unit = unit,
                MatchText = window
            });
        }

        // Aggregate by item
        var aggregated = recognized
            .GroupBy(r => r.ItemId)
            .Select(g => new RecognizedVoiceItem
            {
                ItemId = g.Key,
                ItemNameEn = g.First().ItemNameEn,
                ItemNameAr = g.First().ItemNameAr,
                CategoryNameEn = g.First().CategoryNameEn,
                CategoryNameAr = g.First().CategoryNameAr,
                Quantity = g.Sum(x => x.Quantity),
                Unit = g.First().Unit,
                MatchText = g.First().MatchText
            })
            .ToList();

        // Enrich with category names
        var itemLookup = allItems.ToDictionary(i => i.Id);
        var categoryCache = new Dictionary<string, Category?>();

        foreach (var item in aggregated)
        {
            if (!itemLookup.TryGetValue(item.ItemId, out var entity))
            {
                continue;
            }

            if (!categoryCache.TryGetValue(entity.CategoryId, out var category))
            {
                category = await _categoryRepository.GetByIdAsync(entity.CategoryId);
                categoryCache[entity.CategoryId] = category;
            }

            if (category != null)
            {
                item.CategoryNameEn = category.NameEn;
                item.CategoryNameAr = category.NameAr;
            }
        }

        CartDto? lastCart = null;

        foreach (var item in aggregated)
        {
            var request = new AddCartItemRequest
            {
                ItemId = item.ItemId,
                Quantity = item.Quantity
            };

            lastCart = await _cartService.AddItemAsync(userId, request);
        }

        // If nothing recognized, just return the current cart
        if (lastCart == null)
        {
            lastCart = await _cartService.GetCartAsync(userId);
        }

        return new VoiceCartResult
        {
            Transcription = transcription,
            Items = aggregated,
            Cart = lastCart
        };
    }

    private static int FindNameIndex(string text, string nameEn, string nameAr)
    {
        if (!string.IsNullOrWhiteSpace(nameAr))
        {
            var indexAr = text.IndexOf(nameAr, StringComparison.OrdinalIgnoreCase);
            if (indexAr >= 0)
            {
                return indexAr;
            }
        }

        if (!string.IsNullOrWhiteSpace(nameEn))
        {
            var indexEn = text.IndexOf(nameEn, StringComparison.OrdinalIgnoreCase);
            if (indexEn >= 0)
            {
                return indexEn;
            }
        }

        return -1;
    }

    private static string GetWindowAround(string text, int index, int windowSize)
    {
        if (index < 0 || string.IsNullOrEmpty(text))
        {
            return string.Empty;
        }

        var start = Math.Max(0, index - windowSize);
        var length = Math.Min(text.Length - start, windowSize * 2);
        return text.Substring(start, length);
    }

    private static (decimal quantity, string unit) ExtractQuantityAndUnit(string window)
    {
        if (string.IsNullOrWhiteSpace(window))
        {
            return (0, string.Empty);
        }

        var quantity = 0m;
        var unit = string.Empty;

        var numberMatch = Regex.Match(window, @"(\d+(?:[\.,]\d+)?)");
        if (numberMatch.Success && decimal.TryParse(numberMatch.Groups[1].Value.Replace(',', '.'), out var q))
        {
            quantity = q;
        }

        if (window.Contains("كيلو") || window.Contains("kg") || window.Contains("كجم"))
        {
            unit = "kg";
        }
        else if (window.Contains("قطعة") || window.Contains("قطع") || window.Contains("حبة") || window.Contains("حبات") || window.Contains("piece"))
        {
            unit = "piece";
        }

        return (quantity, unit);
    }
}
