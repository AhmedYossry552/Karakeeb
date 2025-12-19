using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;

namespace Recycling.Application.Services;

public class StockService : IStockService
{
    private readonly IItemRepository _itemRepository;

    public StockService(IItemRepository itemRepository)
    {
        _itemRepository = itemRepository;
    }

    public async Task UpdateItemQuantitiesAsync(ICollection<OrderItem> orderItems, bool increase)
    {
        if (orderItems == null || orderItems.Count == 0)
        {
            return;
        }

        foreach (var orderItem in orderItems)
        {
            if (string.IsNullOrWhiteSpace(orderItem.ItemId))
            {
                continue;
            }

            var item = await _itemRepository.GetByIdAsync(orderItem.ItemId);
            if (item == null)
            {
                continue;
            }

            var quantityChange = increase ? orderItem.Quantity : -orderItem.Quantity;
            var newQuantity = item.Quantity + quantityChange;

            if (!increase && newQuantity < 0)
            {
                throw new InvalidOperationException($"Not enough stock for item '{item.NameEn}'. Need: {orderItem.Quantity}, Have: {item.Quantity}");
            }

            item.Quantity = newQuantity;
            await _itemRepository.UpdateAsync(item);
        }
    }
}
