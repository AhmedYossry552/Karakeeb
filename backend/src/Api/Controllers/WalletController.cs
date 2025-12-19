using System.Security.Claims;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Wallet;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class WalletController : ControllerBase
{
    private readonly IWalletService _walletService;
    private readonly IUserTransactionRepository _transactionRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly RecyclingDbContext _dbContext;

    public WalletController(IWalletService walletService, IUserTransactionRepository transactionRepository, IOrderRepository orderRepository, RecyclingDbContext dbContext)
    {
        _walletService = walletService;
        _transactionRepository = transactionRepository;
        _orderRepository = orderRepository;
        _dbContext = dbContext;
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

    // GET /api/wallet
    [HttpGet]
    public async Task<IActionResult> GetBalance()
    {
        var userId = GetUserId();
        var balance = await _walletService.GetUserBalanceAsync(userId);
        return Ok(new { balance });
    }

    // GET /api/wallet/transactions
    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions()
    {
        var userId = GetUserId();
        var transactions = await _walletService.GetUserTransactionsAsync(userId);
        return Ok(transactions);
    }

    // POST /api/wallet/transactions
    [HttpPost("transactions")]
    public async Task<IActionResult> AddTransaction([FromBody] AddUserTransactionRequest request)
    {
        var userId = GetUserId();

        try
        {
            var result = await _walletService.AddUserTransactionAsync(userId, request);
            return StatusCode(StatusCodes.Status201Created, result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // GET /api/wallet/admin/summary
    [HttpGet("admin/summary")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetSystemSummary()
    {
        const decimal PointsPerEgp = 19m;

        var (totalCashback, totalWithdrawals) = await _transactionRepository.GetTotalsAsync();
        var buyerCashTotal = await _orderRepository.GetBuyerCashTotalAsync();

        var totalCustomerPoints = await _dbContext.Users
            .AsNoTracking()
            .Where(u => u.Role == "customer")
            .SumAsync(u => (decimal?)u.TotalPoints) ?? 0m;

        var remainingPointsValue = decimal.Floor(totalCustomerPoints / PointsPerEgp);

        return Ok(new
        {
            success = true,
            data = new
            {
                totalCashback,
                totalWithdrawals,
                buyerCashTotal,
                totalCustomerPoints,
                remainingPointsValue
            }
        });
    }

    // GET /api/wallet/admin/cashbacks
    [HttpGet("admin/cashbacks")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetCashbackTransactionsForAdmin([FromQuery] int page = 1, [FromQuery] int limit = 10)
    {
        if (page < 1)
        {
            page = 1;
        }

        if (limit < 1)
        {
            limit = 10;
        }

        var query = from t in _dbContext.UserTransactions.AsNoTracking()
                    join u in _dbContext.Users.AsNoTracking() on t.UserId equals u.Id
                    where t.Type == "cashback"
                          && t.Gateway == "points_conversion"
                          && u.Role == "customer"
                    orderby t.TransactionDate descending
                    select new
                    {
                        transactionId = t.Id,
                        userId = u.Id,
                        userName = u.Name,
                        userEmail = u.Email,
                        amount = t.Amount,
                        date = t.TransactionDate,
                        type = t.Type,
                        gateway = t.Gateway
                    };

        var totalItems = await query.CountAsync();
        var skip = (page - 1) * limit;
        var items = await query
            .Skip(skip)
            .Take(limit)
            .ToListAsync();

        var totalPages = (int)System.Math.Ceiling(totalItems / (double)limit);

        var pagination = new
        {
            currentPage = page,
            totalItems,
            totalPages,
            hasMore = page < totalPages,
            limit
        };

        return Ok(new
        {
            success = true,
            data = items,
            pagination
        });
    }
}
