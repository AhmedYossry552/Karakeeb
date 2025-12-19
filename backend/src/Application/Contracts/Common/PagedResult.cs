using System.Collections.Generic;

namespace Recycling.Application.Contracts.Common;

public class PagedResult<T>
{
    public IReadOnlyList<T> Data { get; set; } = new List<T>();

    public PaginationInfo Pagination { get; set; } = new();
}

public class PaginationInfo
{
    public int CurrentPage { get; set; }
    public int ItemsPerPage { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
    public bool HasNextPage { get; set; }
}
