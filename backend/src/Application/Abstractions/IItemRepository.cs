using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface IItemRepository
{
    Task<(IReadOnlyList<Item> Items, int TotalCount)> GetPagedAsync(int page, int pageSize);
    Task<(IReadOnlyList<Item> Items, int TotalCount)> GetByCategoryNameEnPagedAsync(string categoryNameEn, int page, int pageSize);
    Task<Item?> GetByIdAsync(string id);
    Task UpdateAsync(Item item);
}
