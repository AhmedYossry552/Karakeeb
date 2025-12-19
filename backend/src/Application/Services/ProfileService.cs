using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Auth;

namespace Recycling.Application.Services;

public class ProfileService : IProfileService
{
    private readonly IUserRepository _userRepository;

    private readonly IBuyerProfileRepository _buyerProfileRepository;
    private readonly IDeliveryProfileRepository _deliveryProfileRepository;

    public ProfileService(
        IUserRepository userRepository,
        IBuyerProfileRepository buyerProfileRepository,
        IDeliveryProfileRepository deliveryProfileRepository)
    {
        _userRepository = userRepository;
        _buyerProfileRepository = buyerProfileRepository;
        _deliveryProfileRepository = deliveryProfileRepository;
    }

    public async Task<ProfileDto?> GetProfileAsync(string userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            return null;
        }

        var buyerProfile = string.Equals(user.Role, "buyer", System.StringComparison.OrdinalIgnoreCase)
            ? await _buyerProfileRepository.GetByUserIdAsync(user.Id)
            : null;

        var deliveryProfile = string.Equals(user.Role, "delivery", System.StringComparison.OrdinalIgnoreCase)
            ? await _deliveryProfileRepository.GetByUserIdAsync(user.Id)
            : null;

        return new ProfileDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            ImgUrl = user.ImgUrl,

            BusinessName = buyerProfile?.BusinessName,
            BusinessType = buyerProfile?.BusinessType,
            BusinessAddress = buyerProfile?.BusinessAddress,
            BusinessLicense = buyerProfile?.BusinessLicense,
            TaxId = buyerProfile?.TaxId,
            EstimatedMonthlyVolume = buyerProfile?.EstimatedMonthlyVolume,

            LicenseNumber = deliveryProfile?.LicenseNumber,
            VehicleType = deliveryProfile?.VehicleType,
            NationalId = deliveryProfile?.NationalId,
            EmergencyContact = deliveryProfile?.EmergencyContact,
            DeliveryImage = deliveryProfile?.DeliveryImage,
            VehicleImage = deliveryProfile?.VehicleImage,
            CriminalRecord = deliveryProfile?.CriminalRecord,
            DeliveryStatus = deliveryProfile?.Status
        };
    }

    public async Task<ProfileDto?> UpdateProfileAsync(string userId, UpdateProfileRequest request)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            return null;
        }

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            user.Name = request.Name;
        }

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            user.PhoneNumber = request.PhoneNumber;
        }

        if (!string.IsNullOrWhiteSpace(request.ImgUrl))
        {
            user.ImgUrl = request.ImgUrl;
        }

        user.UpdatedAt = System.DateTime.UtcNow;

        await _userRepository.UpdateAsync(user);

        if (string.Equals(user.Role, "buyer", System.StringComparison.OrdinalIgnoreCase))
        {
            var buyerProfile = await _buyerProfileRepository.GetByUserIdAsync(user.Id);

            if (buyerProfile != null)
            {
                if (!string.IsNullOrWhiteSpace(request.BusinessName))
                {
                    buyerProfile.BusinessName = request.BusinessName;
                }

                if (!string.IsNullOrWhiteSpace(request.BusinessType))
                {
                    buyerProfile.BusinessType = request.BusinessType;
                }

                if (!string.IsNullOrWhiteSpace(request.BusinessAddress))
                {
                    buyerProfile.BusinessAddress = request.BusinessAddress;
                }

                if (!string.IsNullOrWhiteSpace(request.BusinessLicense))
                {
                    buyerProfile.BusinessLicense = request.BusinessLicense;
                }

                if (!string.IsNullOrWhiteSpace(request.TaxId))
                {
                    buyerProfile.TaxId = request.TaxId;
                }

                if (!string.IsNullOrWhiteSpace(request.EstimatedMonthlyVolume))
                {
                    buyerProfile.EstimatedMonthlyVolume = request.EstimatedMonthlyVolume;
                }

                await _buyerProfileRepository.UpdateAsync(buyerProfile);
            }
        }

        if (string.Equals(user.Role, "delivery", System.StringComparison.OrdinalIgnoreCase))
        {
            var deliveryProfile = await _deliveryProfileRepository.GetByUserIdAsync(user.Id);

            if (deliveryProfile != null)
            {
                if (!string.IsNullOrWhiteSpace(request.LicenseNumber))
                {
                    deliveryProfile.LicenseNumber = request.LicenseNumber;
                }

                if (!string.IsNullOrWhiteSpace(request.VehicleType))
                {
                    deliveryProfile.VehicleType = request.VehicleType;
                }

                if (!string.IsNullOrWhiteSpace(request.NationalId))
                {
                    deliveryProfile.NationalId = request.NationalId;
                }

                if (!string.IsNullOrWhiteSpace(request.EmergencyContact))
                {
                    deliveryProfile.EmergencyContact = request.EmergencyContact;
                }

                if (!string.IsNullOrWhiteSpace(request.DeliveryImage))
                {
                    deliveryProfile.DeliveryImage = request.DeliveryImage;
                }

                if (!string.IsNullOrWhiteSpace(request.VehicleImage))
                {
                    deliveryProfile.VehicleImage = request.VehicleImage;
                }

                if (!string.IsNullOrWhiteSpace(request.CriminalRecord))
                {
                    deliveryProfile.CriminalRecord = request.CriminalRecord;
                }

                await _deliveryProfileRepository.UpdateAsync(deliveryProfile);
            }
        }

        return await GetProfileAsync(userId);
    }

    public async Task<bool> DeleteProfileAsync(string userId)
    {
        var user = await _userRepository.GetByIdAsync(userId);
        if (user == null)
        {
            return false;
        }

        // For now we just mark as not approved instead of hard delete, similar to soft delete behavior
        user.IsApproved = false;
        user.UpdatedAt = System.DateTime.UtcNow;
        await _userRepository.UpdateAsync(user);

        return true;
    }
}
