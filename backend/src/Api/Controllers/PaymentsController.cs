using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/payment")]
[Authorize(Roles = "admin")]
public class PaymentsController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private static readonly HttpClient HttpClient = new HttpClient();

    public PaymentsController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private string GetStripeSecretKey()
    {
        var key = _configuration["Stripe:SecretKey"] ?? Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Stripe secret key is not configured");
        }

        return key;
    }

    private static string GetChargeStatus(JsonElement charge)
    {
        var refunded = charge.TryGetProperty("refunded", out var refundedProp) && refundedProp.GetBoolean();
        var amountRefunded = charge.TryGetProperty("amount_refunded", out var amountRefundedProp) ? amountRefundedProp.GetInt64() : 0;
        if (refunded || amountRefunded > 0)
        {
            return "refunded";
        }

        var disputed = charge.TryGetProperty("disputed", out var disputedProp) && disputedProp.ValueKind == JsonValueKind.True;
        if (disputed)
        {
            return "disputed";
        }

        var hasFailureCode = charge.TryGetProperty("failure_code", out var failureCodeProp) && failureCodeProp.ValueKind == JsonValueKind.String && !string.IsNullOrEmpty(failureCodeProp.GetString());
        var hasFailureMessage = charge.TryGetProperty("failure_message", out var failureMsgProp) && failureMsgProp.ValueKind == JsonValueKind.String && !string.IsNullOrEmpty(failureMsgProp.GetString());
        if (hasFailureCode || hasFailureMessage)
        {
            return "failed";
        }

        var amount = charge.TryGetProperty("amount", out var amountProp) ? amountProp.GetInt64() : 0;
        var amountCaptured = charge.TryGetProperty("amount_captured", out var amountCapturedProp) ? amountCapturedProp.GetInt64() : 0;

        if (amountCaptured == amount && amount > 0)
        {
            return "succeeded";
        }

        if (amountCaptured > 0 && amountCaptured < amount)
        {
            return "partially_captured";
        }

        if (charge.TryGetProperty("status", out var statusProp) && statusProp.ValueKind == JsonValueKind.String)
        {
            return statusProp.GetString() ?? "pending";
        }

        return "pending";
    }

    private static object CalculatePaymentStats(List<JsonElement> charges)
    {
        long totalAmount = 0;
        long totalRevenue = 0;
        long refundedAmount = 0;
        var statusCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var charge in charges)
        {
            var amount = charge.TryGetProperty("amount", out var amountProp) ? amountProp.GetInt64() : 0;
            var amountRefunded = charge.TryGetProperty("amount_refunded", out var amountRefundedProp) ? amountRefundedProp.GetInt64() : 0;

            totalAmount += amount;
            refundedAmount += amountRefunded;

            var status = GetChargeStatus(charge);
            if (!statusCounts.ContainsKey(status))
            {
                statusCounts[status] = 0;
            }

            statusCounts[status]++;

            if (status.Equals("succeeded", StringComparison.OrdinalIgnoreCase))
            {
                totalRevenue += amount - amountRefunded;
            }
        }

        var totalCount = charges.Count;
        var successfulCount = statusCounts.TryGetValue("succeeded", out var succ) ? succ : 0;
        var successRate = totalCount > 0 ? (int)Math.Round((double)successfulCount / totalCount * 100) : 0;
        var averageAmount = totalCount > 0 ? (long)Math.Round((double)totalAmount / totalCount) : 0;

        return new
        {
            totalCount,
            totalAmount,
            totalRevenue,
            refundedAmount,
            successRate,
            statusCounts,
            averageAmount
        };
    }

    // GET /api/payment?page=&limit=&status=&startDate=&endDate=&search=&currency=&minAmount=&maxAmount=&country=&refunded=&disputed=
    [HttpGet]
    public async Task<IActionResult> GetAllPayments(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 25,
        [FromQuery] string? status = null,
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null,
        [FromQuery] string? search = null,
        [FromQuery] string? currency = null,
        [FromQuery] string? minAmount = null,
        [FromQuery] string? maxAmount = null,
        [FromQuery] string? country = null,
        [FromQuery] string? refunded = null,
        [FromQuery] string? disputed = null)
    {
        try
        {
            var secretKey = GetStripeSecretKey();

            var pageNum = Math.Max(1, page);
            var limitNum = limit <= 0 ? 25 : Math.Min(limit, 100);

            // We'll fetch up to page * limit (capped at 100) and then paginate client-side.
            var fetchLimit = Math.Min(pageNum * limitNum, 100);

            var queryParams = new List<string>
            {
                $"limit={fetchLimit}"
            };

            // Date filtering (created[gte], created[lte])
            if (!string.IsNullOrEmpty(startDate) || !string.IsNullOrEmpty(endDate))
            {
                if (!string.IsNullOrEmpty(startDate) && DateTime.TryParse(startDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var start))
                {
                    var gte = new DateTimeOffset(start).ToUnixTimeSeconds();
                    queryParams.Add($"created[gte]={gte}");
                }

                if (!string.IsNullOrEmpty(endDate) && DateTime.TryParse(endDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var end))
                {
                    end = end.Date.AddDays(1).AddTicks(-1); // 23:59:59.999
                    var lte = new DateTimeOffset(end).ToUnixTimeSeconds();
                    queryParams.Add($"created[lte]={lte}");
                }
            }

            // If search is email, try to find customer and filter by customer id
            if (!string.IsNullOrEmpty(search) && search.Contains("@"))
            {
                try
                {
                    var customersUrl = $"https://api.stripe.com/v1/customers?limit=1&email={Uri.EscapeDataString(search)}";
                    var customerRequest = new HttpRequestMessage(HttpMethod.Get, customersUrl);
                    customerRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

                    var customerResponse = await HttpClient.SendAsync(customerRequest);
                    var customerBody = await customerResponse.Content.ReadAsStringAsync();

                    if (customerResponse.IsSuccessStatusCode)
                    {
                        using var customerDoc = JsonDocument.Parse(customerBody);
                        if (customerDoc.RootElement.TryGetProperty("data", out var custData) && custData.ValueKind == JsonValueKind.Array && custData.GetArrayLength() > 0)
                        {
                            var customerId = custData[0].GetProperty("id").GetString();
                            if (!string.IsNullOrEmpty(customerId))
                            {
                                queryParams.Add($"customer={Uri.EscapeDataString(customerId)}");
                            }
                        }
                    }
                }
                catch
                {
                    // Ignore customer search errors, continue without customer filter
                }
            }

            var baseUrl = "https://api.stripe.com/v1/charges";
            var url = queryParams.Count > 0 ? $"{baseUrl}?{string.Join("&", queryParams)}" : baseUrl;

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

            var response = await HttpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode(502, new { success = false, error = "Stripe error", details = body });
            }

            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("data", out var dataElement) || dataElement.ValueKind != JsonValueKind.Array)
            {
                return StatusCode(502, new { success = false, error = "Invalid Stripe response" });
            }

            var allCharges = new List<JsonElement>();
            foreach (var item in dataElement.EnumerateArray())
            {
                allCharges.Add(item.Clone());
            }

            // Apply client-side filtering similar to Node implementation
            IEnumerable<JsonElement> filtered = allCharges;

            if (!string.IsNullOrEmpty(status))
            {
                filtered = filtered.Where(c => string.Equals(GetChargeStatus(c), status, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrEmpty(currency))
            {
                filtered = filtered.Where(c => c.TryGetProperty("currency", out var cur) && cur.ValueKind == JsonValueKind.String && string.Equals(cur.GetString(), currency, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrEmpty(minAmount) && double.TryParse(minAmount, NumberStyles.Any, CultureInfo.InvariantCulture, out var minAmountValue))
            {
                var minCents = (long)Math.Round(minAmountValue * 100);
                filtered = filtered.Where(c => c.TryGetProperty("amount", out var amt) && amt.GetInt64() >= minCents);
            }

            if (!string.IsNullOrEmpty(maxAmount) && double.TryParse(maxAmount, NumberStyles.Any, CultureInfo.InvariantCulture, out var maxAmountValue))
            {
                var maxCents = (long)Math.Round(maxAmountValue * 100);
                filtered = filtered.Where(c => c.TryGetProperty("amount", out var amt) && amt.GetInt64() <= maxCents);
            }

            if (!string.IsNullOrEmpty(country))
            {
                filtered = filtered.Where(c =>
                {
                    if (c.TryGetProperty("billing_details", out var billing) && billing.ValueKind == JsonValueKind.Object &&
                        billing.TryGetProperty("address", out var addr) && addr.ValueKind == JsonValueKind.Object &&
                        addr.TryGetProperty("country", out var countryProp) && countryProp.ValueKind == JsonValueKind.String)
                    {
                        var val = countryProp.GetString();
                        return string.Equals(val, country, StringComparison.OrdinalIgnoreCase);
                    }

                    return false;
                });
            }

            if (!string.IsNullOrEmpty(refunded))
            {
                var wantRefunded = string.Equals(refunded, "true", StringComparison.OrdinalIgnoreCase);
                filtered = filtered.Where(c =>
                {
                    var isRefunded = (c.TryGetProperty("refunded", out var refProp) && refProp.GetBoolean()) ||
                                     (c.TryGetProperty("amount_refunded", out var amtRefProp) && amtRefProp.GetInt64() > 0);

                    return wantRefunded ? isRefunded : !isRefunded;
                });
            }

            if (!string.IsNullOrEmpty(disputed))
            {
                var wantDisputed = string.Equals(disputed, "true", StringComparison.OrdinalIgnoreCase);
                filtered = filtered.Where(c =>
                {
                    var isDisputed = c.TryGetProperty("disputed", out var dispProp) && dispProp.ValueKind == JsonValueKind.True;
                    return wantDisputed ? isDisputed : !isDisputed;
                });
            }

            if (!string.IsNullOrEmpty(search) && !search.Contains("@"))
            {
                var searchTerm = search.ToLowerInvariant();

                filtered = filtered.Where(c =>
                {
                    var fields = new List<string?>();

                    if (c.TryGetProperty("id", out var idProp) && idProp.ValueKind == JsonValueKind.String)
                    {
                        fields.Add(idProp.GetString());
                    }

                    if (c.TryGetProperty("billing_details", out var billing) && billing.ValueKind == JsonValueKind.Object)
                    {
                        if (billing.TryGetProperty("email", out var emailProp) && emailProp.ValueKind == JsonValueKind.String)
                        {
                            fields.Add(emailProp.GetString());
                        }
                        if (billing.TryGetProperty("name", out var nameProp) && nameProp.ValueKind == JsonValueKind.String)
                        {
                            fields.Add(nameProp.GetString());
                        }
                        if (billing.TryGetProperty("phone", out var phoneProp) && phoneProp.ValueKind == JsonValueKind.String)
                        {
                            fields.Add(phoneProp.GetString());
                        }
                    }

                    if (c.TryGetProperty("description", out var descProp) && descProp.ValueKind == JsonValueKind.String)
                    {
                        fields.Add(descProp.GetString());
                    }

                    if (c.TryGetProperty("receipt_email", out var receiptEmailProp) && receiptEmailProp.ValueKind == JsonValueKind.String)
                    {
                        fields.Add(receiptEmailProp.GetString());
                    }

                    return fields.Where(f => !string.IsNullOrEmpty(f))
                                 .Any(f => f!.ToLowerInvariant().Contains(searchTerm));
                });
            }

            var filteredList = filtered.ToList();
            var totalCount = filteredList.Count;
            var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling((double)totalCount / limitNum);

            var startIndex = (pageNum - 1) * limitNum;
            if (startIndex < 0)
            {
                startIndex = 0;
            }

            var paginatedChargeElements = filteredList.Skip(startIndex).Take(limitNum).ToList();
            var paginatedCharges = paginatedChargeElements
                .Select(c => JsonSerializer.Deserialize<object>(c.GetRawText())!)
                .ToList();

            var stats = CalculatePaymentStats(filteredList);

            return Ok(new
            {
                success = true,
                data = paginatedCharges,
                pagination = new
                {
                    page = pageNum,
                    limit = limitNum,
                    total = totalCount,
                    totalPages,
                    hasNextPage = pageNum < totalPages,
                    hasPrevPage = pageNum > 1
                },
                stats,
                filters = new
                {
                    status,
                    startDate,
                    endDate,
                    search,
                    currency,
                    minAmount,
                    maxAmount,
                    country,
                    refunded,
                    disputed
                }
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    // GET /api/payment/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetPaymentStats(
        [FromQuery] string? startDate = null,
        [FromQuery] string? endDate = null,
        [FromQuery] string? status = null,
        [FromQuery] string? currency = null)
    {
        try
        {
            var secretKey = GetStripeSecretKey();

            var queryParams = new List<string>
            {
                "limit=100"
            };

            if (!string.IsNullOrEmpty(startDate) || !string.IsNullOrEmpty(endDate))
            {
                if (!string.IsNullOrEmpty(startDate) && DateTime.TryParse(startDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var start))
                {
                    var gte = new DateTimeOffset(start).ToUnixTimeSeconds();
                    queryParams.Add($"created[gte]={gte}");
                }

                if (!string.IsNullOrEmpty(endDate) && DateTime.TryParse(endDate, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var end))
                {
                    end = end.Date.AddDays(1).AddTicks(-1);
                    var lte = new DateTimeOffset(end).ToUnixTimeSeconds();
                    queryParams.Add($"created[lte]={lte}");
                }
            }

            var baseUrl = "https://api.stripe.com/v1/charges";
            var url = queryParams.Count > 0 ? $"{baseUrl}?{string.Join("&", queryParams)}" : baseUrl;

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

            var response = await HttpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode(502, new { success = false, error = "Stripe error", details = body });
            }

            using var doc = JsonDocument.Parse(body);
            if (!doc.RootElement.TryGetProperty("data", out var dataElement) || dataElement.ValueKind != JsonValueKind.Array)
            {
                return StatusCode(502, new { success = false, error = "Invalid Stripe response" });
            }

            var allCharges = new List<JsonElement>();
            foreach (var item in dataElement.EnumerateArray())
            {
                allCharges.Add(item.Clone());
            }

            IEnumerable<JsonElement> filtered = allCharges;

            if (!string.IsNullOrEmpty(status))
            {
                filtered = filtered.Where(c => string.Equals(GetChargeStatus(c), status, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrEmpty(currency))
            {
                filtered = filtered.Where(c => c.TryGetProperty("currency", out var cur) && cur.ValueKind == JsonValueKind.String && string.Equals(cur.GetString(), currency, StringComparison.OrdinalIgnoreCase));
            }

            var filteredList = filtered.ToList();
            var stats = CalculatePaymentStats(filteredList);

            return Ok(new
            {
                success = true,
                data = stats
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    // GET /api/payment/{id} and alias /api/payments/{id} (for existing frontend hook)
    [HttpGet("{id}")]
    [HttpGet("/api/payments/{id}")]
    public async Task<IActionResult> GetPaymentById(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { success = false, error = "Payment ID is required" });
        }

        try
        {
            var secretKey = GetStripeSecretKey();
            var url = $"https://api.stripe.com/v1/charges/{Uri.EscapeDataString(id)}?expand[]=payment_method&expand[]=customer";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

            var response = await HttpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return StatusCode(404, new { success = false, error = "Payment not found", details = body });
            }

            var paymentObject = JsonSerializer.Deserialize<object>(body);

            return Ok(new
            {
                success = true,
                data = paymentObject
            });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(500, new { success = false, error = ex.Message });
        }
    }

    public class RefundRequest
    {
        public long? Amount { get; set; }
        public string? Reason { get; set; }
        public string? CustomerEmail { get; set; }
    }

    // POST /api/payment/{id}/refund
    [HttpPost("{id}/refund")]
    public async Task<IActionResult> RefundPayment(string id, [FromBody] RefundRequest request)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return BadRequest(new { success = false, message = "Payment ID is required" });
        }

        try
        {
            var secretKey = GetStripeSecretKey();
            var reason = string.IsNullOrWhiteSpace(request?.Reason) ? "requested_by_customer" : request!.Reason!;

            async Task<(JsonDocument paymentDoc, string paymentType)> RetrievePaymentAsync()
            {
                // Try as payment_intent first if id starts with pi_
                if (id.StartsWith("pi_", StringComparison.OrdinalIgnoreCase))
                {
                    var piUrl = $"https://api.stripe.com/v1/payment_intents/{Uri.EscapeDataString(id)}?expand[]=customer";
                    var piRequest = new HttpRequestMessage(HttpMethod.Get, piUrl);
                    piRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

                    var piResponse = await HttpClient.SendAsync(piRequest);
                    var piBody = await piResponse.Content.ReadAsStringAsync();

                    if (piResponse.IsSuccessStatusCode)
                    {
                        return (JsonDocument.Parse(piBody), "payment_intent");
                    }
                }

                // Try as charge
                var chUrl = $"https://api.stripe.com/v1/charges/{Uri.EscapeDataString(id)}?expand[]=customer";
                var chRequest = new HttpRequestMessage(HttpMethod.Get, chUrl);
                chRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

                var chResponse = await HttpClient.SendAsync(chRequest);
                var chBody = await chResponse.Content.ReadAsStringAsync();

                if (chResponse.IsSuccessStatusCode)
                {
                    return (JsonDocument.Parse(chBody), "charge");
                }

                // If pi_ but first attempt failed, return last error
                if (id.StartsWith("pi_", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException("Invalid payment ID: not found as Payment Intent or Charge");
                }

                // Try as payment_intent fallback when id doesn't start with ch_
                if (!id.StartsWith("ch_", StringComparison.OrdinalIgnoreCase))
                {
                    var piUrl2 = $"https://api.stripe.com/v1/payment_intents/{Uri.EscapeDataString(id)}?expand[]=customer";
                    var piRequest2 = new HttpRequestMessage(HttpMethod.Get, piUrl2);
                    piRequest2.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

                    var piResponse2 = await HttpClient.SendAsync(piRequest2);
                    var piBody2 = await piResponse2.Content.ReadAsStringAsync();

                    if (piResponse2.IsSuccessStatusCode)
                    {
                        return (JsonDocument.Parse(piBody2), "payment_intent");
                    }
                }

                throw new InvalidOperationException("Invalid payment ID: not found as Payment Intent or Charge");
            }

            var (paymentDoc, paymentType) = await RetrievePaymentAsync();
            using (paymentDoc)
            {
                var root = paymentDoc.RootElement;

                long originalAmount = root.TryGetProperty("amount", out var amtProp) ? amtProp.GetInt64() : 0;
                if (originalAmount <= 0)
                {
                    return BadRequest(new { success = false, message = "Cannot refund payment with zero amount" });
                }

                if (paymentType == "payment_intent")
                {
                    if (root.TryGetProperty("status", out var statusProp) && statusProp.ValueKind == JsonValueKind.String)
                    {
                        var st = statusProp.GetString();
                        if (!string.Equals(st, "succeeded", StringComparison.OrdinalIgnoreCase))
                        {
                            return BadRequest(new { success = false, message = $"Cannot refund payment with status: {st}" });
                        }
                    }
                }
                else if (paymentType == "charge")
                {
                    if (root.TryGetProperty("paid", out var paidProp) && paidProp.ValueKind == JsonValueKind.False)
                    {
                        return BadRequest(new { success = false, message = "Cannot refund unpaid charge" });
                    }
                }

                var refundParams = new List<KeyValuePair<string, string>>
                {
                    new KeyValuePair<string, string>("reason", reason)
                };

                if (request?.Amount is > 0)
                {
                    refundParams.Add(new KeyValuePair<string, string>("amount", request.Amount.Value.ToString()));
                }

                if (paymentType == "payment_intent")
                {
                    refundParams.Add(new KeyValuePair<string, string>("payment_intent", id));
                }
                else
                {
                    refundParams.Add(new KeyValuePair<string, string>("charge", id));
                }

                var refundRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.stripe.com/v1/refunds");
                refundRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);
                refundRequest.Content = new FormUrlEncodedContent(refundParams);

                var refundResponse = await HttpClient.SendAsync(refundRequest);
                var refundBody = await refundResponse.Content.ReadAsStringAsync();

                if (!refundResponse.IsSuccessStatusCode)
                {
                    return StatusCode(400, new { success = false, message = $"Stripe Error: {refundBody}" });
                }

                using var refundDoc = JsonDocument.Parse(refundBody);
                var refundRoot = refundDoc.RootElement;

                var refundAmount = refundRoot.TryGetProperty("amount", out var refundAmtProp) ? refundAmtProp.GetInt64() : 0;
                var currency = refundRoot.TryGetProperty("currency", out var curProp) && curProp.ValueKind == JsonValueKind.String ? curProp.GetString() ?? "egp" : "egp";

                var isPartialRefund = refundAmount > 0 && refundAmount < originalAmount;

                string? emailToUse = request?.CustomerEmail;

                // For now we do not send emails, but we try to surface any available email for compatibility with old response shape.
                if (string.IsNullOrEmpty(emailToUse))
                {
                    if (root.TryGetProperty("receipt_email", out var recEmailProp) && recEmailProp.ValueKind == JsonValueKind.String)
                    {
                        emailToUse = recEmailProp.GetString();
                    }
                    else if (root.TryGetProperty("billing_details", out var billing) && billing.ValueKind == JsonValueKind.Object &&
                             billing.TryGetProperty("email", out var billEmailProp) && billEmailProp.ValueKind == JsonValueKind.String)
                    {
                        emailToUse = billEmailProp.GetString();
                    }
                    else if (root.TryGetProperty("customer", out var custProp) && custProp.ValueKind == JsonValueKind.Object &&
                             custProp.TryGetProperty("email", out var custEmailProp) && custEmailProp.ValueKind == JsonValueKind.String)
                    {
                        emailToUse = custEmailProp.GetString();
                    }
                }

                return Ok(new
                {
                    success = true,
                    message = isPartialRefund ? "Partial payment refunded successfully" : "Payment refunded successfully",
                    refund = new
                    {
                        id = refundRoot.TryGetProperty("id", out var idProp) && idProp.ValueKind == JsonValueKind.String ? idProp.GetString() : null,
                        amount = refundAmount,
                        currency,
                        status = refundRoot.TryGetProperty("status", out var statusProp2) && statusProp2.ValueKind == JsonValueKind.String ? statusProp2.GetString() : null,
                        created = refundRoot.TryGetProperty("created", out var createdProp) ? createdProp.GetInt64() : 0,
                        isPartial = isPartialRefund,
                        originalAmount,
                        refundType = isPartialRefund ? "partial" : "full"
                    },
                    emailNotification = new
                    {
                        sent = !string.IsNullOrEmpty(emailToUse),
                        email = emailToUse,
                        adminNotificationSent = false
                    }
                });
            }
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
