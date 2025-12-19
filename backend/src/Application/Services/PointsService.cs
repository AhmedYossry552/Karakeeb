using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Recycling.Application.Abstractions;
using Recycling.Application.Contracts.Common;
using Recycling.Application.Contracts.Points;
using Recycling.Domain.Entities;

namespace Recycling.Application.Services;

public class PointsService : IPointsService
{
    private readonly IUserRepository _userRepository;
    private readonly IOrderRepository _orderRepository;
    private readonly IUserPointsHistoryRepository _userPointsHistoryRepository;

    private static readonly IReadOnlyList<RewardLevel> RewardLevels = new List<RewardLevel>
    {
        new RewardLevel
        {
            Id = 1,
            Name = "Eco Beginner",
            MinRecycles = 0,
            MaxRecycles = 4,
            BonusPerOrder = 1,
            BonusPerReachedTier = 50
        },
        new RewardLevel
        {
            Id = 2,
            Name = "Eco Starter",
            MinRecycles = 5,
            MaxRecycles = 14,
            BonusPerOrder = 5,
            BonusPerReachedTier = 150
        },
        new RewardLevel
        {
            Id = 3,
            Name = "Green Helper",
            MinRecycles = 15,
            MaxRecycles = 29,
            BonusPerOrder = 10,
            BonusPerReachedTier = 300
        },
        new RewardLevel
        {
            Id = 4,
            Name = "Silver Recycler",
            MinRecycles = 30,
            MaxRecycles = 49,
            BonusPerOrder = 15,
            BonusPerReachedTier = 500
        },
        new RewardLevel
        {
            Id = 5,
            Name = "Gold Guardian",
            MinRecycles = 50,
            MaxRecycles = 74,
            BonusPerOrder = 20,
            BonusPerReachedTier = 700
        },
        new RewardLevel
        {
            Id = 6,
            Name = "Platinum Pioneer",
            MinRecycles = 75,
            MaxRecycles = 99,
            BonusPerOrder = 25,
            BonusPerReachedTier = 850
        },
        new RewardLevel
        {
            Id = 7,
            Name = "Diamond Elite",
            MinRecycles = 100,
            MaxRecycles = int.MaxValue,
            BonusPerOrder = 30,
            BonusPerReachedTier = 1000
        }
    };

    public PointsService(
        IUserRepository userRepository,
        IOrderRepository orderRepository,
        IUserPointsHistoryRepository userPointsHistoryRepository)
    {
        _userRepository = userRepository;
        _orderRepository = orderRepository;
        _userPointsHistoryRepository = userPointsHistoryRepository;
    }

    public async Task AddUserPointsAsync(string userId, int points, string? orderId, string? reason)
    {
        if (points <= 0)
        {
            throw new ArgumentException("Points must be greater than zero", nameof(points));
        }

        var user = await _userRepository.GetByIdAsync(userId)
                   ?? throw new InvalidOperationException("User not found");

        var now = DateTime.UtcNow;

        var baseReason = string.IsNullOrWhiteSpace(reason) ? "Points added" : reason;

        var bonusResult = await GetTierBonusPointsAsync(userId);
        var bonusPoints = bonusResult.BonusPoints;
        var reachedNewTier = bonusResult.ReachedNewTier;
        var tier = bonusResult.Tier;

        var totalToAdd = points + bonusPoints;

        user.TotalPoints += totalToAdd;
        if (user.TotalPoints < 0)
        {
            user.TotalPoints = 0;
        }

        await _userRepository.UpdateAsync(user);

        var historyBase = new UserPointsHistory
        {
            UserId = userId,
            OrderId = orderId,
            Points = points,
            Type = "earned",
            Reason = baseReason,
            Timestamp = now
        };

        await _userPointsHistoryRepository.AddAsync(historyBase);

        if (bonusPoints > 0 && tier != null)
        {
            var bonusReason = reachedNewTier
                ? $"Tier milestone — you reached {tier.Name}"
                : $"Bonus for completing an order as a {tier.Name}";

            var historyBonus = new UserPointsHistory
            {
                UserId = userId,
                OrderId = orderId,
                Points = bonusPoints,
                Type = "earned",
                Reason = bonusReason,
                Timestamp = now
            };

            await _userPointsHistoryRepository.AddAsync(historyBonus);
        }
    }

    public async Task DeductUserPointsAsync(string userId, int points, string? reason)
    {
        if (points <= 0)
        {
            throw new ArgumentException("Points must be greater than zero", nameof(points));
        }

        var user = await _userRepository.GetByIdAsync(userId)
                   ?? throw new InvalidOperationException("User not found");

        var now = DateTime.UtcNow;

        if (user.TotalPoints < points)
        {
            throw new InvalidOperationException("Insufficient points");
        }

        user.TotalPoints -= points;

        await _userRepository.UpdateAsync(user);

        var history = new UserPointsHistory
        {
            UserId = userId,
            OrderId = null,
            Points = -points,
            Type = "deducted",
            Reason = string.IsNullOrWhiteSpace(reason) ? "Points deducted" : reason,
            Timestamp = now
        };

        await _userPointsHistoryRepository.AddAsync(history);
    }

    public async Task<UserPointsSummaryDto> GetUserPointsAsync(string userId, int page, int limit)
    {
        var user = await _userRepository.GetByIdAsync(userId)
                   ?? throw new InvalidOperationException("User not found");

        if (page < 1) page = 1;
        if (limit < 1) limit = 10;

        var (historyItems, totalHistory) =
            await _userPointsHistoryRepository.GetByUserIdPagedAsync(userId, page, limit);

        var totalRecycled = await _orderRepository.CountCompletedByUserAsync(userId);

        var historyDtos = historyItems.Select(h => new UserPointsHistoryEntryDto
        {
            OrderId = h.OrderId,
            Points = h.Points,
            Type = h.Type,
            Reason = h.Reason,
            Timestamp = h.Timestamp
        }).ToList();

        var totalPages = (int)Math.Ceiling(totalHistory / (double)limit);

        return new UserPointsSummaryDto
        {
            UserId = user.Id,
            Name = user.Name,
            Email = user.Email,
            TotalPoints = user.TotalPoints,
            TotalRecycled = totalRecycled,
            History = historyDtos,
            Pagination = new PaginationInfo
            {
                CurrentPage = page,
                ItemsPerPage = limit,
                TotalItems = totalHistory,
                TotalPages = totalPages,
                HasNextPage = page < totalPages
            }
        };
    }

    public async Task<IReadOnlyList<PointsLeaderboardEntryDto>> GetLeaderboardAsync(int limit)
    {
        if (limit < 1)
        {
            limit = 10;
        }

        var users = await _userRepository.GetTopByTotalPointsAsync(limit);

        var result = new List<PointsLeaderboardEntryDto>();

        var rank = 1;
        foreach (var user in users)
        {
            result.Add(new PointsLeaderboardEntryDto
            {
                Rank = rank++,
                UserId = user.Id,
                Name = user.Name,
                Email = user.Email,
                TotalPoints = user.TotalPoints,
                ImageUrl = user.ImgUrl
            });
        }

        return result;
    }

    public async Task<IReadOnlyList<OrderWithPointsDto>> GetUserOrdersWithPointsAsync(string userId)
    {
        var orders = await _orderRepository.GetByUserIdAsync(userId);

        var result = new List<OrderWithPointsDto>();

        foreach (var order in orders)
        {
            var basePoints = order.Items.Sum(i => (int)(i.Points * i.Quantity));

            var dto = new OrderWithPointsDto
            {
                Id = order.Id,
                Status = order.Status,
                CreatedAt = order.CreatedAt,
                PotentialPoints = basePoints,
                PointsEarned = order.Status == "completed" ? basePoints : 0
            };

            result.Add(dto);
        }

        return result;
    }

    private static RewardLevel? GetTierByTotalRecycles(int totalRecycles)
    {
        return RewardLevels.FirstOrDefault(t =>
            totalRecycles >= t.MinRecycles && totalRecycles <= t.MaxRecycles);
    }

    private async Task<(int BonusPoints, bool ReachedNewTier, RewardLevel? Tier)> GetTierBonusPointsAsync(string userId)
    {
        var completedOrdersCount = await _orderRepository.CountCompletedByUserAsync(userId);

        var currentTier = GetTierByTotalRecycles(completedOrdersCount);
        if (currentTier == null)
        {
            return (0, false, null);
        }

        var previousTier = GetTierByTotalRecycles(completedOrdersCount - 1);

        var reachedNewTier = previousTier == null || previousTier.Id != currentTier.Id;

        var bonusPoints = currentTier.BonusPerOrder + (reachedNewTier ? currentTier.BonusPerReachedTier : 0);

        return (bonusPoints, reachedNewTier, currentTier);
    }

    private sealed class RewardLevel
    {
        public int Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public int MinRecycles { get; init; }
        public int MaxRecycles { get; init; }
        public int BonusPerOrder { get; init; }
        public int BonusPerReachedTier { get; init; }
    }
}
