using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Delivery;

namespace Recycling.Application.Services;

public class DeliveryService : IDeliveryService
{
    private readonly IUserRepository _userRepository;
    private readonly IDeliveryProfileRepository _deliveryProfileRepository;

    public DeliveryService(IUserRepository userRepository, IDeliveryProfileRepository deliveryProfileRepository)
    {
        _userRepository = userRepository;
        _deliveryProfileRepository = deliveryProfileRepository;
    }

    public async Task<IReadOnlyList<DeliverySummaryDto>> GetAllAsync()
    {
        var users = await _userRepository.GetByRoleAsync("delivery");

        var result = new List<DeliverySummaryDto>(users.Count);

        foreach (var user in users)
        {
            var profile = await _deliveryProfileRepository.GetByUserIdAsync(user.Id);

            result.Add(MapToDto(user, profile));
        }

        return result;
    }

    public async Task<DeliverySummaryDto?> GetByIdAsync(string id)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null || !string.Equals(user.Role, "delivery", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var profile = await _deliveryProfileRepository.GetByUserIdAsync(user.Id);
        return MapToDto(user, profile);
    }

    public async Task<bool> UpdateApprovalStatusAsync(string id, bool isApproved)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null || !string.Equals(user.Role, "delivery", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        user.IsApproved = isApproved;
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);

        var profile = await _deliveryProfileRepository.GetByUserIdAsync(user.Id);
        if (profile != null)
        {
            profile.Status = isApproved ? "approved" : "pending";
            await _deliveryProfileRepository.UpdateAsync(profile);
        }

        return true;
    }

    public async Task<bool> RevokeAsync(string id, string? reason)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user == null || !string.Equals(user.Role, "delivery", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (!user.IsApproved)
        {
            return false;
        }

        user.IsApproved = false;
        user.RefreshToken = null;
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);

        var profile = await _deliveryProfileRepository.GetByUserIdAsync(user.Id);
        if (profile != null)
        {
            profile.Status = "revoked";
            profile.RevokedAt = DateTime.UtcNow;
            profile.RevokeReason = string.IsNullOrWhiteSpace(reason) ? "Access revoked by admin" : reason;
            await _deliveryProfileRepository.UpdateAsync(profile);
        }

        return true;
    }

    public async Task<(bool Success, string? PreviousStatus)> ReapplyAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return (false, null);
        }

        var user = await _userRepository.GetByEmailAsync(email);
        if (user == null || !string.Equals(user.Role, "delivery", StringComparison.OrdinalIgnoreCase))
        {
            return (false, null);
        }

        var profile = await _deliveryProfileRepository.GetByUserIdAsync(user.Id);

        var currentStatus = profile?.Status ?? (user.IsApproved ? "approved" : "pending");

        if (string.Equals(currentStatus, "approved", StringComparison.OrdinalIgnoreCase))
        {
            return (false, currentStatus);
        }

        if (string.Equals(currentStatus, "pending", StringComparison.OrdinalIgnoreCase))
        {
            return (false, currentStatus);
        }

        // For statuses like "declined" or "revoked", reset to pending so the user can be re-evaluated.
        user.IsApproved = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);

        if (profile != null)
        {
            profile.Status = "pending";
            profile.ApprovedAt = null;
            profile.RevokedAt = null;
            profile.RevokeReason = null;
            await _deliveryProfileRepository.UpdateAsync(profile);
        }

        return (true, currentStatus);
    }

    private static DeliverySummaryDto MapToDto(Domain.Entities.User user, Domain.Entities.DeliveryProfile? profile)
    {
        return new DeliverySummaryDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            IsApproved = user.IsApproved,
            LicenseNumber = profile?.LicenseNumber,
            VehicleType = profile?.VehicleType,
            NationalId = profile?.NationalId,
            EmergencyContact = profile?.EmergencyContact,
            DeliveryImage = profile?.DeliveryImage,
            VehicleImage = profile?.VehicleImage,
            CriminalRecord = profile?.CriminalRecord,
            Status = profile?.Status
        };
    }
}
