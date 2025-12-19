using System;
using System.Linq;
using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Catalog;
using Recycling.Application.Contracts.Common;

namespace Recycling.Application.Services;

public class CatalogService : ICatalogService
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IItemRepository _itemRepository;

    public CatalogService(ICategoryRepository categoryRepository, IItemRepository itemRepository)
    {
        _categoryRepository = categoryRepository;
        _itemRepository = itemRepository;
    }

    public async Task<PagedResult<CategoryDto>> GetCategoriesAsync(int page, int limit)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        var (items, total) = await _categoryRepository.GetPagedAsync(page, limit);

        var data = items.Select(c => new CategoryDto
        {
            Id = c.Id,
            NameEn = c.NameEn,
            NameAr = c.NameAr,
            DescriptionEn = c.DescriptionEn,
            DescriptionAr = c.DescriptionAr,
            Image = c.Image
        }).ToList();

        return BuildPagedResult(data, page, limit, total);
    }

    public async Task<PagedResult<ItemDto>> GetItemsAsync(int page, int limit)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        var (items, total) = await _itemRepository.GetPagedAsync(page, limit);

        var data = items.Select(MapItem).ToList();
        return BuildPagedResult(data, page, limit, total);
    }

    public async Task<PagedResult<ItemDto>> GetItemsByCategoryNameAsync(string categoryNameEn, int page, int limit)
    {
        if (string.IsNullOrWhiteSpace(categoryNameEn))
        {
            throw new ArgumentException("Category name is required", nameof(categoryNameEn));
        }

        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        var (items, total) = await _itemRepository.GetByCategoryNameEnPagedAsync(categoryNameEn, page, limit);

        var data = items.Select(MapItem).ToList();
        return BuildPagedResult(data, page, limit, total);
    }

    private static ItemDto MapItem(Domain.Entities.Item item) => new()
    {
        Id = item.Id,
        CategoryId = item.CategoryId,
        NameEn = item.NameEn,
        NameAr = item.NameAr,
        Points = item.Points,
        Price = item.Price,
        MeasurementUnit = item.MeasurementUnit,
        Image = item.Image,
        Quantity = item.Quantity
    };

    private static PagedResult<T> BuildPagedResult<T>(System.Collections.Generic.IReadOnlyList<T> data, int page, int limit, int total)
    {
        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return new PagedResult<T>
        {
            Data = data,
            Pagination = new PaginationInfo
            {
                CurrentPage = page,
                ItemsPerPage = limit,
                TotalItems = total,
                TotalPages = totalPages,
                HasNextPage = page < totalPages
            }
        };
    }
}
