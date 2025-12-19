using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Recycling.Application.Abstractions;
using Recycling.Domain.Entities;
using Recycling.Infrastructure.Persistence;

namespace Recycling.Api.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly IUserRepository _userRepository;
    private readonly RecyclingDbContext _dbContext;

    public ReviewsController(IUserRepository userRepository, RecyclingDbContext dbContext)
    {
        _userRepository = userRepository;
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

    // GET /api/reviews/courier/{courierId}
    // Port of Node route used by Next.js courier profile.
    [HttpGet("courier/{courierId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCourierReviews(string courierId, [FromQuery] int page = 1, [FromQuery] int limit = 3)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = 3;

        var courier = await _userRepository.GetByIdAsync(courierId);
        if (courier == null || !string.Equals(courier.Role, "delivery", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound();
        }

        var averageRating = courier.Rating ?? 0m;

        var query = from r in _dbContext.OrderReviews
                    join o in _dbContext.Orders on r.OrderId equals o.Id
                    join u in _dbContext.Users on o.UserId equals u.Id
                    where r.CourierId == courierId
                    select new { Review = r, Order = o, Customer = u };

        var totalReviews = await query.CountAsync();

        var skip = (page - 1) * limit;
        var data = await query
            .OrderByDescending(x => x.Review.ReviewedAt)
            .Skip(skip)
            .Take(limit)
            .ToListAsync();

        var reviews = data.Select(x => new
        {
            id = x.Review.Id,
            stars = x.Review.Stars,
            comment = x.Review.Comment ?? string.Empty,
            reviewedAt = x.Review.ReviewedAt,
            customerName = x.Customer.Name,
            orderDate = x.Order.CreatedAt
        }).ToList();

        var courierDto = new
        {
            id = courier.Id,
            name = courier.Name,
            averageRating,
            totalReviews = courier.TotalReviews,
            totalDeliveries = (int?)null,
            onTimeRate = (decimal?)null,
            averageDeliveryTime = (TimeSpan?)null
        };

        var totalPages = (int)Math.Ceiling(totalReviews / (double)limit);

        var pagination = new
        {
            currentPage = page,
            totalPages,
            totalReviews,
            hasNext = page < totalPages,
            hasPrev = page > 1
        };

        return Ok(new
        {
            courier = courierDto,
            reviews,
            pagination
        });
    }

    // GET /api/reviews/my-reviews
    [HttpGet("my-reviews")]
    [Authorize]
    public async Task<IActionResult> GetMyReviews([FromQuery] int page = 1, [FromQuery] int limit = 50)
    {
        var userId = GetUserId();

        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        var query = from r in _dbContext.OrderReviews
                    join o in _dbContext.Orders on r.OrderId equals o.Id
                    join c in _dbContext.Users on r.CourierId equals c.Id into couriers
                    from c in couriers.DefaultIfEmpty()
                    where r.UserId == userId
                    select new { Review = r, Order = o, Courier = c };

        var total = await query.CountAsync();

        var skip = (page - 1) * limit;
        var data = await query
            .OrderByDescending(x => x.Review.ReviewedAt)
            .Skip(skip)
            .Take(limit)
            .ToListAsync();

        var reviews = data.Select(x => new
        {
            orderId = x.Review.OrderId,
            stars = x.Review.Stars,
            comment = x.Review.Comment ?? string.Empty,
            reviewedAt = x.Review.ReviewedAt,
            courier = new
            {
                id = x.Courier?.Id,
                name = x.Courier?.Name ?? "Unknown Courier"
            },
            orderDate = x.Order.CreatedAt,
            itemCount = x.Order.Items.Count
        }).ToList();

        var totalPages = (int)Math.Ceiling(total / (double)limit);

        return Ok(new
        {
            success = true,
            reviews,
            pagination = new
            {
                currentPage = page,
                totalPages,
                totalReviews = total,
                hasNext = page < totalPages,
                hasPrev = page > 1
            }
        });
    }

    public class SubmitReviewRequest
    {
        public int Rating { get; set; }
        public string? Comments { get; set; }
    }

    // POST /api/orders/{orderId}/review
    [HttpPost("~/api/orders/{orderId}/review")]
    [Authorize(Roles = "customer,buyer")]
    public async Task<IActionResult> CreateOrderReview(string orderId, [FromBody] SubmitReviewRequest request)
    {
        var userId = GetUserId();

        if (request == null)
        {
            return BadRequest(new { message = "Request body is required" });
        }

        if (request.Rating < 1 || request.Rating > 5)
        {
            return BadRequest(new { message = "Rating is required and must be between 1 and 5" });
        }

        if (request.Comments != null && request.Comments.Length > 1000)
        {
            return BadRequest(new { message = "Comments are too long (max 1000 characters)" });
        }

        var order = await _dbContext.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            return NotFound(new { message = "Order not found" });
        }

        if (!string.Equals(order.UserId, userId, StringComparison.Ordinal))
        {
            return Forbid();
        }

        if (!string.Equals(order.Status, "completed", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Can only review completed orders" });
        }

        if (string.IsNullOrWhiteSpace(order.CourierId))
        {
            return BadRequest(new { message = "No courier assigned to this order" });
        }

        var existing = await _dbContext.OrderReviews
            .FirstOrDefaultAsync(r => r.OrderId == orderId && r.UserId == userId);
        if (existing != null)
        {
            return Conflict(new { message = "Review has already been submitted for this order" });
        }

        var now = DateTime.UtcNow;

        var review = new OrderReview
        {
            OrderId = orderId,
            UserId = userId,
            CourierId = order.CourierId,
            Stars = request.Rating,
            Comment = string.IsNullOrWhiteSpace(request.Comments) ? null : request.Comments.Trim(),
            ReviewedAt = now,
            UpdatedAt = null
        };

        _dbContext.OrderReviews.Add(review);
        await _dbContext.SaveChangesAsync();

        await RecalculateCourierStatsAsync(order.CourierId!);

        var courier = await _userRepository.GetByIdAsync(order.CourierId!);

        return StatusCode(201, new
        {
            success = true,
            message = "Delivery review submitted successfully",
            review = new
            {
                orderId = order.Id,
                stars = review.Stars,
                comment = review.Comment,
                reviewedAt = review.ReviewedAt,
                courier = courier == null
                    ? null
                    : new
                    {
                        id = courier.Id,
                        name = courier.Name
                    }
            }
        });
    }

    // GET /api/orders/{orderId}/review
    [HttpGet("~/api/orders/{orderId}/review")]
    [Authorize(Roles = "customer,buyer")]
    public async Task<IActionResult> GetOrderReview(string orderId)
    {
        var userId = GetUserId();

        var order = await _dbContext.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            return NotFound(new { message = "Order not found" });
        }

        if (!string.Equals(order.UserId, userId, StringComparison.Ordinal))
        {
            return Forbid();
        }

        var review = await _dbContext.OrderReviews
            .FirstOrDefaultAsync(r => r.OrderId == orderId && r.UserId == userId);

        if (review == null)
        {
            return NotFound(new { message = "No review found for this order" });
        }

        var courier = string.IsNullOrWhiteSpace(order.CourierId)
            ? null
            : await _userRepository.GetByIdAsync(order.CourierId!);

        return Ok(new
        {
            success = true,
            review = new
            {
                orderId = order.Id,
                stars = review.Stars,
                comment = review.Comment,
                reviewedAt = review.ReviewedAt,
                courier = courier == null
                    ? null
                    : new
                    {
                        id = courier.Id,
                        name = courier.Name
                    },
                canEdit = true
            }
        });
    }

    // PUT /api/orders/{orderId}/review
    [HttpPut("~/api/orders/{orderId}/review")]
    [Authorize(Roles = "customer,buyer")]
    public async Task<IActionResult> UpdateOrderReview(string orderId, [FromBody] SubmitReviewRequest request)
    {
        var userId = GetUserId();

        if (request == null)
        {
            return BadRequest(new { message = "Request body is required" });
        }

        if (request.Rating < 1 || request.Rating > 5)
        {
            return BadRequest(new { message = "Rating must be between 1 and 5" });
        }

        if (request.Comments != null && request.Comments.Length > 1000)
        {
            return BadRequest(new { message = "Comments are too long (max 1000 characters)" });
        }

        var order = await _dbContext.Orders
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            return NotFound(new { message = "Order not found" });
        }

        if (!string.Equals(order.UserId, userId, StringComparison.Ordinal))
        {
            return Forbid();
        }

        var review = await _dbContext.OrderReviews
            .FirstOrDefaultAsync(r => r.OrderId == orderId && r.UserId == userId);

        if (review == null)
        {
            return NotFound(new { message = "No review found to update" });
        }

        review.Stars = request.Rating;
        review.Comment = string.IsNullOrWhiteSpace(request.Comments) ? null : request.Comments.Trim();
        review.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(review.CourierId))
        {
            await RecalculateCourierStatsAsync(review.CourierId);
        }

        var courier = string.IsNullOrWhiteSpace(review.CourierId)
            ? null
            : await _userRepository.GetByIdAsync(review.CourierId!);

        return Ok(new
        {
            success = true,
            message = "Delivery review updated successfully",
            review = new
            {
                orderId = order.Id,
                stars = review.Stars,
                comment = review.Comment,
                reviewedAt = review.ReviewedAt,
                courier = courier == null
                    ? null
                    : new
                    {
                        id = courier.Id,
                        name = courier.Name
                    }
            }
        });
    }

    // DELETE /api/orders/{orderId}/review
    [HttpDelete("~/api/orders/{orderId}/review")]
    [Authorize(Roles = "customer,buyer")]
    public async Task<IActionResult> DeleteOrderReview(string orderId)
    {
        var userId = GetUserId();

        var review = await _dbContext.OrderReviews
            .FirstOrDefaultAsync(r => r.OrderId == orderId && r.UserId == userId);

        if (review == null)
        {
            return NotFound(new
            {
                success = false,
                message = "No review found to delete"
            });
        }

        var courierId = review.CourierId;
        var stars = review.Stars;

        _dbContext.OrderReviews.Remove(review);
        await _dbContext.SaveChangesAsync();

        object? courierInfo = null;

        if (!string.IsNullOrWhiteSpace(courierId))
        {
            await RecalculateCourierStatsAsync(courierId!);

            var courier = await _userRepository.GetByIdAsync(courierId!);
            if (courier != null)
            {
                courierInfo = new
                {
                    id = courier.Id,
                    name = courier.Name,
                    updatedRating = courier.Rating ?? 0m,
                    updatedTotalReviews = courier.TotalReviews
                };
            }
        }

        return Ok(new
        {
            success = true,
            message = "Review deleted successfully",
            deletedReview = new
            {
                orderId,
                rating = stars,
                courier = courierInfo
            }
        });
    }

    // GET /api/reviewable-orders
    [HttpGet("~/api/reviewable-orders")]
    [Authorize(Roles = "customer,buyer")]
    public async Task<IActionResult> GetReviewableOrders()
    {
        var userId = GetUserId();

        var completedOrdersQuery = _dbContext.Orders
            .Include(o => o.Items)
            .Where(o => o.UserId == userId && o.Status == "completed" && !string.IsNullOrEmpty(o.CourierId));

        var reviewedOrderIds = await _dbContext.OrderReviews
            .Where(r => r.UserId == userId)
            .Select(r => r.OrderId)
            .ToListAsync();

        var orders = await completedOrdersQuery
            .Where(o => !reviewedOrderIds.Contains(o.Id))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var courierIds = orders
            .Where(o => !string.IsNullOrWhiteSpace(o.CourierId))
            .Select(o => o.CourierId!)
            .Distinct()
            .ToList();

        var couriers = courierIds.Count == 0
            ? Array.Empty<User>()
            : await _userRepository.GetByIdsAsync(courierIds);

        var courierLookup = couriers.ToDictionary(c => c.Id, c => c);

        var result = orders.Select(o =>
        {
            courierLookup.TryGetValue(o.CourierId!, out var courier);

            return new
            {
                _id = o.Id,
                createdAt = o.CreatedAt,
                courier = courier == null
                    ? null
                    : new
                    {
                        _id = courier.Id,
                        name = courier.Name
                    },
                items = o.Items.Select(i => new
                {
                    id = i.Id,
                    nameEn = i.NameEn,
                    nameAr = i.NameAr,
                    quantity = i.Quantity
                }).ToList(),
                address = new { },
                status = "completed"
            };
        }).ToList();

        return Ok(new
        {
            success = true,
            orders = result,
            total = result.Count
        });
    }

    // PATCH /api/courier/{courierId}/fix-stats
    [HttpPatch("~/api/courier/{courierId}/fix-stats")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> FixCourierStats(string courierId)
    {
        if (string.IsNullOrWhiteSpace(courierId))
        {
            return BadRequest(new { message = "Invalid courier ID" });
        }

        await RecalculateCourierStatsAsync(courierId);

        var courier = await _userRepository.GetByIdAsync(courierId);
        if (courier == null)
        {
            return NotFound(new { message = "Courier not found" });
        }

        return Ok(new
        {
            success = true,
            message = "Courier stats recalculated successfully",
            courier = new
            {
                id = courier.Id,
                name = courier.Name,
                rating = courier.Rating ?? 0m,
                totalReviews = courier.TotalReviews
            }
        });
    }

    private async Task RecalculateCourierStatsAsync(string courierId)
    {
        var reviews = await _dbContext.OrderReviews
            .Where(r => r.CourierId == courierId)
            .ToListAsync();

        var courier = await _userRepository.GetByIdAsync(courierId);
        if (courier == null)
        {
            return;
        }

        if (reviews.Count == 0)
        {
            courier.Rating = null;
            courier.TotalReviews = 0;
        }
        else
        {
            var average = Math.Round(reviews.Average(r => r.Stars), 2);
            courier.Rating = (decimal)average;
            courier.TotalReviews = reviews.Count;
        }

        await _userRepository.UpdateAsync(courier);
    }
}
