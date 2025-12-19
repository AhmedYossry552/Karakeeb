using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Addresses;
using Recycling.Domain.Entities;

namespace Recycling.Application.Services;

public class AddressService : IAddressService
{
    private readonly IAddressRepository _addressRepository;

    public AddressService(IAddressRepository addressRepository)
    {
        _addressRepository = addressRepository;
    }

    public async Task<IReadOnlyList<AddressDto>> GetUserAddressesAsync(string userId)
    {
        var addresses = await _addressRepository.GetByUserIdAsync(userId);
        return addresses.Select(MapToDto).ToList();
    }

    public async Task<AddressDto?> GetAddressAsync(string userId, string addressId)
    {
        var address = await _addressRepository.GetByIdAsync(addressId);
        if (address == null || address.UserId != userId)
        {
            return null;
        }

        return MapToDto(address);
    }

    public async Task<AddressDto> CreateAddressAsync(string userId, CreateAddressRequest request)
    {
        var now = DateTime.UtcNow;
        var address = new Address
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            City = request.City,
            Area = request.Area,
            Street = request.Street,
            Building = request.Building,
            Floor = request.Floor,
            Apartment = request.Apartment,
            Landmark = request.Landmark,
            Notes = request.Notes,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _addressRepository.AddAsync(address);
        return MapToDto(address);
    }

    public async Task<AddressDto?> UpdateAddressAsync(string userId, string addressId, UpdateAddressRequest request)
    {
        var address = await _addressRepository.GetByIdAsync(addressId);
        if (address == null || address.UserId != userId)
        {
            return null;
        }

        address.City = request.City;
        address.Area = request.Area;
        address.Street = request.Street;
        address.Building = request.Building;
        address.Floor = request.Floor;
        address.Apartment = request.Apartment;
        address.Landmark = request.Landmark;
        address.Notes = request.Notes;
        address.UpdatedAt = DateTime.UtcNow;

        await _addressRepository.UpdateAsync(address);
        return MapToDto(address);
    }

    public async Task<bool> DeleteAddressAsync(string userId, string addressId)
    {
        var address = await _addressRepository.GetByIdAsync(addressId);
        if (address == null || address.UserId != userId)
        {
            return false;
        }

        await _addressRepository.DeleteAsync(address);
        return true;
    }

    private static AddressDto MapToDto(Address address) => new()
    {
        Id = address.Id,
        City = address.City,
        Area = address.Area,
        Street = address.Street,
        Building = address.Building,
        Floor = address.Floor,
        Apartment = address.Apartment,
        Landmark = address.Landmark,
        Notes = address.Notes,
        CreatedAt = address.CreatedAt,
        UpdatedAt = address.UpdatedAt
    };
}
