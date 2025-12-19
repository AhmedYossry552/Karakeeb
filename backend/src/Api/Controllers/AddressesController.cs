using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Addresses;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/addresses")]
[Authorize]
public class AddressesController : ControllerBase
{
    private readonly IAddressService _addressService;

    public AddressesController(IAddressService addressService)
    {
        _addressService = addressService;
    }

    private string GetUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
        {
            throw new UnauthorizedAccessException("User id not found in token");
        }

        return userId;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyAddresses()
    {
        var userId = GetUserId();
        var addresses = await _addressService.GetUserAddressesAsync(userId);
        return Ok(addresses);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var userId = GetUserId();
        var address = await _addressService.GetAddressAsync(userId, id);
        if (address is null)
        {
            return NotFound();
        }

        return Ok(address);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAddressRequest request)
    {
        var userId = GetUserId();
        var address = await _addressService.CreateAddressAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = address.Id }, address);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateAddressRequest request)
    {
        var userId = GetUserId();
        var address = await _addressService.UpdateAddressAsync(userId, id, request);
        if (address is null)
        {
            return NotFound();
        }

        return Ok(address);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var userId = GetUserId();
        var success = await _addressService.DeleteAddressAsync(userId, id);
        if (!success)
        {
            return NotFound();
        }

        return NoContent();
    }
}
