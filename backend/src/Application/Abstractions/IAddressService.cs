using System.Collections.Generic;
using System.Threading.Tasks;
using Recycling.Application.Contracts.Addresses;

namespace Recycling.Application.Abstractions;

public interface IAddressService
{
    Task<IReadOnlyList<AddressDto>> GetUserAddressesAsync(string userId);
    Task<AddressDto?> GetAddressAsync(string userId, string addressId);
    Task<AddressDto> CreateAddressAsync(string userId, CreateAddressRequest request);
    Task<AddressDto?> UpdateAddressAsync(string userId, string addressId, UpdateAddressRequest request);
    Task<bool> DeleteAddressAsync(string userId, string addressId);
}
