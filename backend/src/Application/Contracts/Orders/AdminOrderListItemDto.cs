using System;
using System.Collections.Generic;
using Recycling.Application.Contracts.Addresses;

namespace Recycling.Application.Contracts.Orders;

public class AdminOrderListItemDto
{
    public string Id { get; set; } = null!;
    public string UserId { get; set; } = null!;
    public string? UserName { get; set; }
    public string? UserEmail { get; set; }
    public string? UserRole { get; set; }
    public string? UserPhoneNumber { get; set; }
    public string Status { get; set; } = null!;
    public string? PaymentMethod { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CollectedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
    public AddressDto? Address { get; set; }
    public List<AdminOrderStatusHistoryDto> StatusHistory { get; set; } = new();
    public string? CourierId { get; set; }
    public string? CourierName { get; set; }
    public string? DeliveryProofPhotoUrl { get; set; }
    public string? DeliveryProofNotes { get; set; }
    public DateTime? DeliveryProofUploadedAt { get; set; }
}
