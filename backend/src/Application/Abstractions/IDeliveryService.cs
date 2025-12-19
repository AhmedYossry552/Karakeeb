using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Application.Contracts.Delivery;

namespace Recycling.Application.Abstractions;

public interface IDeliveryService
{
    Task<IReadOnlyList<DeliverySummaryDto>> GetAllAsync();
    Task<DeliverySummaryDto?> GetByIdAsync(string id);
    Task<bool> UpdateApprovalStatusAsync(string id, bool isApproved);
    Task<bool> RevokeAsync(string id, string? reason);
    Task<(bool Success, string? PreviousStatus)> ReapplyAsync(string email);
}
