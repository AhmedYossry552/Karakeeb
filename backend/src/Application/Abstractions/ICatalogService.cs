using System.Threading.Tasks;
using Recycling.Application.Contracts.Catalog;
using Recycling.Application.Contracts.Common;

namespace Recycling.Application.Abstractions;

public interface ICatalogService
{
    Task<PagedResult<CategoryDto>> GetCategoriesAsync(int page, int limit);
    Task<PagedResult<ItemDto>> GetItemsAsync(int page, int limit);
    Task<PagedResult<ItemDto>> GetItemsByCategoryNameAsync(string categoryNameEn, int page, int limit);
}
