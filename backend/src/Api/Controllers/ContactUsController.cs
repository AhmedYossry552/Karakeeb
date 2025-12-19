using System;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Recycling.Application.Abstractions;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/contact-us")]
public class ContactUsController : ControllerBase
{
    private readonly IContactService _contactService;

    public ContactUsController(IContactService contactService)
    {
        _contactService = contactService;
    }

    public class ContactRequest
    {
        public string Name { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Message { get; set; } = null!;
    }

    [HttpPost]
    public async Task<IActionResult> Send([FromBody] ContactRequest request)
    {
        if (request == null ||
            string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { error = "All fields are required." });
        }

        var name = request.Name.Trim();
        var email = request.Email.Trim();
        var message = request.Message.Trim();

        try
        {
            var address = new MailAddress(email);
            email = address.Address;
        }
        catch (FormatException)
        {
            return BadRequest(new { error = "Invalid email address." });
        }

        try
        {
            await _contactService.SendContactMessageAsync(name, email, message);
            return Ok(new { success = true });
        }
        catch (Exception)
        {
            return StatusCode(500, new { error = "Failed to send email." });
        }
    }
}
