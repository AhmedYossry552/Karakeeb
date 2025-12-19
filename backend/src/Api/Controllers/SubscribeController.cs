using System;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/subscribe")]
public class SubscribeController : ControllerBase
{
    private readonly ISubscriberService _subscriberService;

    public SubscribeController(ISubscriberService subscriberService)
    {
        _subscriberService = subscriberService;
    }

    public class SubscribeRequest
    {
        public string Email { get; set; } = null!;
        public string? Name { get; set; }
    }

    [HttpPost]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { error = "Email is required." });
        }

        var email = request.Email.Trim();

        try
        {
            var address = new MailAddress(email);
            email = address.Address;
        }
        catch (FormatException)
        {
            return BadRequest(new { error = "Invalid email address." });
        }

        var created = await _subscriberService.SubscribeAsync(email, request.Name);

        if (!created)
        {
            return Conflict(new { error = "Email already subscribed" });
        }

        return Ok(new { success = true });
    }
}
