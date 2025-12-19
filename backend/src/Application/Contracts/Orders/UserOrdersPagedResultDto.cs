using System.Collections.Generic;
using Recycling.Application.Contracts.Common;

namespace Recycling.Application.Contracts.Orders;

public class UserOrdersPagedResultDto
{
    public IReadOnlyList<OrderDto> Data { get; set; } = new List<OrderDto>();
    public PaginationInfo Pagination { get; set; } = new();
    public int TotalCompletedOrders { get; set; }
}
