using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api")] // align with Node base: app.use("/api", router())
public class CategoriesController : ControllerBase
{
    private readonly ICatalogService _catalogService;
    private readonly RecyclingDbContext _dbContext;

    public CategoriesController(ICatalogService catalogService, RecyclingDbContext dbContext)
    {
        _catalogService = catalogService;
        _dbContext = dbContext;
    }

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? language = "en",
        [FromQuery] string? role = null)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        language = language?.ToLowerInvariant() == "ar" ? "ar" : "en";

        var query = _dbContext.Categories
            .AsNoTracking()
            .OrderBy(c => c.NameEn);

        var total = await query.CountAsync();

        var categories = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var categoryIds = categories
            .Select(c => c.Id)
            .ToList();

        var items = await _dbContext.Items
            .AsNoTracking()
            .Where(i => categoryIds.Contains(i.CategoryId))
            .ToListAsync();

        var itemsByCategory = items
            .GroupBy(i => i.CategoryId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var transformedCategories = categories.Select(c =>
        {
            var categoryName = new
            {
                en = c.NameEn,
                ar = c.NameAr
            };

            var description = new
            {
                en = c.DescriptionEn ?? string.Empty,
                ar = c.DescriptionAr ?? c.DescriptionEn ?? string.Empty
            };

            var catItems = itemsByCategory.TryGetValue(c.Id, out var list)
                ? list
                : new List<Recycling.Domain.Entities.Item>();

            var categoryDisplayName = language == "ar" ? c.NameAr : c.NameEn;
            var categoryDisplayDescription = language == "ar"
                ? (c.DescriptionAr ?? c.DescriptionEn ?? string.Empty)
                : (c.DescriptionEn ?? c.DescriptionAr ?? string.Empty);

            var transformedItems = catItems.Select(i =>
            {
                var price = i.Price;
                if (!string.IsNullOrWhiteSpace(role) &&
                    string.Equals(role, "buyer", StringComparison.OrdinalIgnoreCase))
                {
                    price = Math.Round(price * 1.5m, 2, MidpointRounding.AwayFromZero);
                }

                var itemName = new
                {
                    en = i.NameEn,
                    ar = i.NameAr
                };

                return new
                {
                    _id = i.Id,
                    name = itemName,
                    points = i.Points,
                    price,
                    measurement_unit = i.MeasurementUnit,
                    image = i.Image,
                    quantity = i.Quantity,
                    categoryId = c.Id,
                    categoryName,
                    displayName = language == "ar" ? i.NameAr : i.NameEn,
                    categoryDisplayName = categoryDisplayName
                };
            }).ToList();

            return new
            {
                _id = c.Id,
                name = categoryName,
                description,
                image = c.Image,
                displayName = categoryDisplayName,
                displayDescription = categoryDisplayDescription,
                items = transformedItems
            };
        }).ToList();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var pagination = new
        {
            currentPage = page,
            itemsPerPage = limit,
            totalItems = total,
            totalPages,
            hasNextPage = page < totalPages,
            hasPreviousPage = page > 1
        };

        return Ok(new
        {
            success = true,
            data = transformedCategories,
            pagination
        });
    }

    [HttpGet("categories/search")]
    public async Task<IActionResult> SearchCategories(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? search = null,
        [FromQuery] string? language = "en",
        [FromQuery] string? role = null)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        language = language?.ToLowerInvariant() == "ar" ? "ar" : "en";
        search = search?.Trim();

        var query = _dbContext.Categories.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLowerInvariant();

            query = query.Where(c =>
                c.NameEn.ToLower().Contains(term) ||
                c.NameAr.ToLower().Contains(term) ||
                (c.DescriptionEn != null && c.DescriptionEn.ToLower().Contains(term)) ||
                (c.DescriptionAr != null && c.DescriptionAr.ToLower().Contains(term)) ||
                _dbContext.Items.Any(i =>
                    i.CategoryId == c.Id &&
                    (i.NameEn.ToLower().Contains(term) ||
                     i.NameAr.ToLower().Contains(term))));
        }

        query = query.OrderBy(c => c.NameEn);

        var total = await query.CountAsync();

        var categories = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var categoryIds = categories
            .Select(c => c.Id)
            .ToList();

        var itemsQuery = _dbContext.Items
            .AsNoTracking()
            .Where(i => categoryIds.Contains(i.CategoryId));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLowerInvariant();
            itemsQuery = itemsQuery.Where(i =>
                i.NameEn.ToLower().Contains(term) ||
                i.NameAr.ToLower().Contains(term));
        }

        var items = await itemsQuery.ToListAsync();

        var itemsByCategory = items
            .GroupBy(i => i.CategoryId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var transformedCategories = categories.Select(c =>
        {
            var categoryName = new
            {
                en = c.NameEn,
                ar = c.NameAr
            };

            var description = new
            {
                en = c.DescriptionEn ?? string.Empty,
                ar = c.DescriptionAr ?? c.DescriptionEn ?? string.Empty
            };

            var catItems = itemsByCategory.TryGetValue(c.Id, out var list)
                ? list
                : new List<Recycling.Domain.Entities.Item>();

            var categoryDisplayName = language == "ar" ? c.NameAr : c.NameEn;
            var categoryDisplayDescription = language == "ar"
                ? (c.DescriptionAr ?? c.DescriptionEn ?? string.Empty)
                : (c.DescriptionEn ?? c.DescriptionAr ?? string.Empty);

            var transformedItems = catItems.Select(i =>
            {
                var price = i.Price;
                if (!string.IsNullOrWhiteSpace(role) &&
                    string.Equals(role, "buyer", StringComparison.OrdinalIgnoreCase))
                {
                    price = Math.Round(price * 1.5m, 2, MidpointRounding.AwayFromZero);
                }

                var itemName = new
                {
                    en = i.NameEn,
                    ar = i.NameAr
                };

                return new
                {
                    _id = i.Id,
                    name = itemName,
                    points = i.Points,
                    price,
                    measurement_unit = i.MeasurementUnit,
                    image = i.Image,
                    quantity = i.Quantity,
                    categoryId = c.Id,
                    categoryName,
                    displayName = language == "ar" ? i.NameAr : i.NameEn,
                    categoryDisplayName = categoryDisplayName
                };
            }).ToList();

            return new
            {
                _id = c.Id,
                name = categoryName,
                description,
                image = c.Image,
                displayName = categoryDisplayName,
                displayDescription = categoryDisplayDescription,
                items = transformedItems
            };
        }).ToList();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var pagination = new
        {
            currentPage = page,
            itemsPerPage = limit,
            totalItems = total,
            totalPages,
            hasNextPage = page < totalPages,
            hasPreviousPage = page > 1
        };

        var searchInfo = new
        {
            searchTerm = search ?? string.Empty,
            hasSearch = !string.IsNullOrWhiteSpace(search),
            resultsCount = total,
            currentPageResults = transformedCategories.Count
        };

        return Ok(new
        {
            success = true,
            data = transformedCategories,
            pagination,
            searchInfo
        });
    }

    // GET /api/categories/get-items?page=&limit=&category=&language=&role=&all=true
    [HttpGet("categories/get-items")]
    public async Task<IActionResult> GetAllItems(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? category = null,
        [FromQuery] string? language = "en",
        [FromQuery] string? role = null,
        [FromQuery(Name = "all")] bool allFlag = false)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        language = NormalizeLanguage(language);
        var normalizedRole = NormalizeRole(role);

        var query =
            from item in _dbContext.Items.AsNoTracking()
            join cat in _dbContext.Categories.AsNoTracking()
                on item.CategoryId equals cat.Id
            select new { Item = item, Category = cat };

        if (!string.IsNullOrWhiteSpace(category) &&
            !string.Equals(category, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(x => x.Category.NameEn == category);
        }

        var total = await query.CountAsync();

        var pagedQuery = query;
        if (!allFlag)
        {
            pagedQuery = pagedQuery
                .OrderBy(x => x.Item.NameEn)
                .Skip((page - 1) * limit)
                .Take(limit);
        }
        else
        {
            pagedQuery = pagedQuery.OrderBy(x => x.Item.NameEn);
        }

        var results = await pagedQuery.ToListAsync();

        var items = results
            .Select(x => MapItemWithCategory(x.Item, x.Category, language!, normalizedRole))
            .ToList();

        if (allFlag)
        {
            return Ok(new
            {
                items,
                total
            });
        }

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var pagination = new
        {
            currentPage = page,
            itemsPerPage = limit,
            totalItems = total,
            totalPages,
            hasNextPage = page < totalPages,
            hasPreviousPage = page > 1
        };

        return Ok(new
        {
            data = items,
            pagination
        });
    }

    // GET /api/categories/get-items/{categoryName}?page=&limit=&language=&role=&search=
    [HttpGet("categories/get-items/{categoryName}")]
    public async Task<IActionResult> GetItemsByCategory(
        [FromRoute] string categoryName,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? language = "en",
        [FromQuery] string? role = null,
        [FromQuery] string? search = null)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        language = NormalizeLanguage(language);
        var normalizedRole = NormalizeRole(role);
        search = search?.Trim();

        var category = await _dbContext.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(c =>
                c.NameEn == categoryName ||
                c.NameAr == categoryName);

        if (category is null)
        {
            return NotFound(new { message = "Category not found" });
        }

        var itemsQuery = _dbContext.Items
            .AsNoTracking()
            .Where(i => i.CategoryId == category.Id);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLowerInvariant();
            itemsQuery = itemsQuery.Where(i =>
                i.NameEn.ToLower().Contains(term) ||
                i.NameAr.ToLower().Contains(term));
        }

        var total = await itemsQuery.CountAsync();

        var itemsPage = await itemsQuery
            .OrderBy(i => i.NameEn)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var items = itemsPage
            .Select(i => MapItemWithCategory(i, category, language!, normalizedRole))
            .ToList();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var pagination = new
        {
            currentPage = page,
            itemsPerPage = limit,
            totalItems = total,
            totalPages,
            hasNextPage = page < totalPages,
            hasPreviousPage = page > 1
        };

        return Ok(new
        {
            data = items,
            pagination
        });
    }

    // GET /api/items?page=&limit=&language=&role=&search=&category=
    // Also handle legacy /api/get-items used by some frontend hooks
    [HttpGet("items")]
    [HttpGet("get-items")]
    public async Task<IActionResult> GetItems(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 10,
        [FromQuery] string? language = "en",
        [FromQuery] string? role = null,
        [FromQuery] string? search = null,
        [FromQuery] string? category = null)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        language = NormalizeLanguage(language);
        var normalizedRole = NormalizeRole(role);
        search = search?.Trim();
        category = category?.Trim();

        var query =
            from item in _dbContext.Items.AsNoTracking()
            join cat in _dbContext.Categories.AsNoTracking()
                on item.CategoryId equals cat.Id
            select new { Item = item, Category = cat };

        if (!string.IsNullOrWhiteSpace(category) &&
            !string.Equals(category, "all", StringComparison.OrdinalIgnoreCase))
        {
            var categoryTerm = category.ToLowerInvariant();
            query = query.Where(x =>
                x.Category.NameEn.ToLower().Contains(categoryTerm) ||
                x.Category.NameAr.ToLower().Contains(categoryTerm));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLowerInvariant();
            query = query.Where(x =>
                x.Item.NameEn.ToLower().Contains(term) ||
                x.Item.NameAr.ToLower().Contains(term));
        }

        var total = await query.CountAsync();

        var results = await query
            .OrderBy(x => x.Item.NameEn)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var items = results
            .Select(x => MapItemWithCategory(x.Item, x.Category, language!, normalizedRole))
            .ToList();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        var pagination = new
        {
            currentPage = page,
            itemsPerPage = limit,
            totalItems = total,
            totalPages,
            hasNextPage = page < totalPages,
            hasPreviousPage = page > 1
        };

        return Ok(new
        {
            data = items,
            pagination
        });
    }

    // GET /api/items/by-name/{itemName}?language=&role=
    [HttpGet("items/by-name/{itemName}")]
    public async Task<IActionResult> GetItemByName(
        [FromRoute] string itemName,
        [FromQuery] string? language = "en",
        [FromQuery] string? role = null)
    {
        if (string.IsNullOrWhiteSpace(itemName))
        {
            return BadRequest(new { message = "Item name is required" });
        }

        language = NormalizeLanguage(language);
        var normalizedRole = NormalizeRole(role);

        var searchName = itemName.Trim().ToLowerInvariant();

        var query =
            from item in _dbContext.Items.AsNoTracking()
            join cat in _dbContext.Categories.AsNoTracking()
                on item.CategoryId equals cat.Id
            select new { Item = item, Category = cat };

        var result = await query.FirstOrDefaultAsync(x =>
            x.Item.NameEn.ToLower() == searchName ||
            x.Item.NameAr.ToLower() == searchName);

        if (result is null)
        {
            return NotFound(new { message = "Item not found" });
        }

        var transformed = MapItemWithCategory(result.Item, result.Category, language!, normalizedRole);

        return Ok(new
        {
            success = true,
            data = transformed
        });
    }

    // POST /api/items/get-by-id
    [HttpPost("items/get-by-id")]
    public async Task<IActionResult> GetItemsById(
        [FromBody] GetItemsByIdRequest request,
        [FromQuery] string? language = "en")
    {
        if (request == null || request.ItemIds == null || request.ItemIds.Count == 0)
        {
            return BadRequest(new
            {
                message = "itemIds array is required",
                success = false
            });
        }

        var ids = request.ItemIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Distinct()
            .ToList();

        if (ids.Count == 0)
        {
            return BadRequest(new
            {
                message = "No valid item IDs provided",
                success = false
            });
        }

        language = NormalizeLanguage(language);
        var normalizedRole = NormalizeRole(request.UserRole);

        var query =
            from item in _dbContext.Items.AsNoTracking()
            join cat in _dbContext.Categories.AsNoTracking()
                on item.CategoryId equals cat.Id
            where ids.Contains(item.Id)
            select new { Item = item, Category = cat };

        var results = await query.ToListAsync();

        var items = results
            .Select(x => MapItemWithCategory(x.Item, x.Category, language!, normalizedRole))
            .ToList();

        return Ok(new
        {
            data = items,
            success = true
        });
    }

    public class GetItemsByIdRequest
    {
        public List<string> ItemIds { get; set; } = new();
        public string? UserRole { get; set; }
    }

    private static string NormalizeLanguage(string? language) =>
        string.Equals(language, "ar", StringComparison.OrdinalIgnoreCase) ? "ar" : "en";

    private static string? NormalizeRole(string? role) =>
        string.IsNullOrWhiteSpace(role) ? null : role.Trim().ToLowerInvariant();

    private static object MapItemWithCategory(
        Recycling.Domain.Entities.Item item,
        Recycling.Domain.Entities.Category category,
        string language,
        string? role)
    {
        var price = item.Price;
        if (string.Equals(role, "buyer", StringComparison.OrdinalIgnoreCase))
        {
            price = Math.Round(price * 1.5m, 2, MidpointRounding.AwayFromZero);
        }

        var categoryName = new
        {
            en = category.NameEn,
            ar = category.NameAr
        };

        var itemName = new
        {
            en = item.NameEn,
            ar = item.NameAr
        };

        var categoryDisplayName = language == "ar" ? category.NameAr : category.NameEn;
        var displayName = language == "ar" ? item.NameAr : item.NameEn;

        return new
        {
            _id = item.Id,
            name = itemName,
            points = item.Points,
            price,
            measurement_unit = item.MeasurementUnit,
            image = item.Image,
            quantity = item.Quantity,
            categoryId = category.Id,
            categoryName,
            categoryDisplayName,
            displayName
        };
    }
}
