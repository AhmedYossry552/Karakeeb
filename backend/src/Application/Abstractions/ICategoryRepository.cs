using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface ICategoryRepository
{
    Task<(IReadOnlyList<Category> Items, int TotalCount)> GetPagedAsync(int page, int pageSize);
    Task<Category?> GetByNameEnAsync(string nameEn);
    Task<Category?> GetByIdAsync(string id);
}
