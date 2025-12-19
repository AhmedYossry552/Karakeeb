using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Domain.Entities;

namespace Recycling.Application.Abstractions;

public interface IStockService
{
    Task UpdateItemQuantitiesAsync(ICollection<OrderItem> orderItems, bool increase);
}
