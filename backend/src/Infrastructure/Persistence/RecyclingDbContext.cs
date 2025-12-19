using Microsoft.EntityFrameworkCore;
using Recycling.Domain.Entities;

namespace Recycling.Infrastructure.Persistence;

public class RecyclingDbContext : DbContext
{
    public RecyclingDbContext(DbContextOptions<RecyclingDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<BuyerProfile> BuyerProfiles => Set<BuyerProfile>();
    public DbSet<DeliveryProfile> DeliveryProfiles => Set<DeliveryProfile>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Item> Items => Set<Item>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderStatusHistory> OrderStatusHistories => Set<OrderStatusHistory>();
    public DbSet<OrderDeliveryProof> OrderDeliveryProofs => Set<OrderDeliveryProof>();
    public DbSet<OrderReview> OrderReviews => Set<OrderReview>();
    public DbSet<UserPointsHistory> UserPointsHistories => Set<UserPointsHistory>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<UserWallet> UserWallets => Set<UserWallet>();
    public DbSet<UserTransaction> UserTransactions => Set<UserTransaction>();
    public DbSet<Otp> Otps => Set<Otp>();
    public DbSet<Session> Sessions => Set<Session>();
    public DbSet<Subscriber> Subscribers => Set<Subscriber>();
    public DbSet<Translation> Translations => Set<Translation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Password).HasColumnName("password").HasMaxLength(255);
            entity.Property(e => e.PhoneNumber).HasColumnName("phone_number").HasMaxLength(50);
            entity.Property(e => e.Provider).HasColumnName("provider").HasMaxLength(50);
            entity.Property(e => e.Role).HasColumnName("role").HasMaxLength(20).IsRequired();
            entity.Property(e => e.StripeCustomerId).HasColumnName("stripe_customer_id").HasMaxLength(255);
            entity.Property(e => e.TotalPoints).HasColumnName("total_points").HasColumnType("decimal(18,2)").HasDefaultValue(0m);
            entity.Property(e => e.IsApproved).HasColumnName("is_approved").HasDefaultValue(false);
            entity.Property(e => e.ImgUrl).HasColumnName("img_url").HasMaxLength(1024);
            entity.Property(e => e.Rating).HasColumnName("rating").HasColumnType("decimal(4,2)");
            entity.Property(e => e.TotalReviews).HasColumnName("total_reviews").HasDefaultValue(0);
            entity.Property(e => e.RefreshToken).HasColumnName("refresh_token");
            entity.Property(e => e.LastActiveAt).HasColumnName("last_active_at");
            entity.Property(e => e.VoiceUsageCount).HasColumnName("voice_usage_count").HasDefaultValue(0);
            entity.Property(e => e.VoiceUsageLimit).HasColumnName("voice_usage_limit");
            entity.Property(e => e.LastVoiceUsageReset).HasColumnName("last_voice_usage_reset");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<BuyerProfile>(entity =>
        {
            entity.ToTable("buyer_profile");
            entity.HasKey(e => e.UserId);

            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(36);
            entity.Property(e => e.BusinessName).HasColumnName("business_name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.BusinessType).HasColumnName("business_type").HasMaxLength(100);
            entity.Property(e => e.BusinessAddress).HasColumnName("business_address").HasMaxLength(255);
            entity.Property(e => e.BusinessLicense).HasColumnName("business_license").HasMaxLength(100);
            entity.Property(e => e.TaxId).HasColumnName("tax_id").HasMaxLength(100);
            entity.Property(e => e.EstimatedMonthlyVolume).HasColumnName("estimated_monthly_volume").HasMaxLength(100);

            entity.HasOne(e => e.User)
                .WithOne()
                .HasForeignKey<BuyerProfile>(e => e.UserId);
        });

        modelBuilder.Entity<DeliveryProfile>(entity =>
        {
            entity.ToTable("delivery_profile");
            entity.HasKey(e => e.UserId);

            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(36);
            entity.Property(e => e.LicenseNumber).HasColumnName("license_number").HasMaxLength(100);
            entity.Property(e => e.VehicleType).HasColumnName("vehicle_type").HasMaxLength(50);
            entity.Property(e => e.NationalId).HasColumnName("national_id").HasMaxLength(50);
            entity.Property(e => e.EmergencyContact).HasColumnName("emergency_contact").HasMaxLength(50);
            entity.Property(e => e.DeliveryImage).HasColumnName("delivery_image");
            entity.Property(e => e.VehicleImage).HasColumnName("vehicle_image");
            entity.Property(e => e.CriminalRecord).HasColumnName("criminal_record");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20);
            entity.Property(e => e.ApprovedAt).HasColumnName("approved_at");
            entity.Property(e => e.RevokedAt).HasColumnName("revoked_at");
            entity.Property(e => e.RevokeReason).HasColumnName("revoke_reason");

            entity.HasOne(e => e.User)
                .WithOne()
                .HasForeignKey<DeliveryProfile>(e => e.UserId);
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
            entity.Property(e => e.NameEn).HasColumnName("name_en").HasMaxLength(255).IsRequired();
            entity.Property(e => e.NameAr).HasColumnName("name_ar").HasMaxLength(255).IsRequired();
            entity.Property(e => e.DescriptionEn).HasColumnName("description_en");
            entity.Property(e => e.DescriptionAr).HasColumnName("description_ar");
            entity.Property(e => e.Image).HasColumnName("image").HasMaxLength(1024);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Item>(entity =>
        {
            entity.ToTable("items");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
            entity.Property(e => e.CategoryId).HasColumnName("category_id").HasMaxLength(36);
            entity.Property(e => e.NameEn).HasColumnName("name_en").HasMaxLength(255).IsRequired();
            entity.Property(e => e.NameAr).HasColumnName("name_ar").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Points).HasColumnName("points");
            entity.Property(e => e.Price).HasColumnName("price").HasColumnType("decimal(18,2)");
            entity.Property(e => e.MeasurementUnit).HasColumnName("measurement_unit");
            entity.Property(e => e.Image).HasColumnName("image").HasMaxLength(1024);
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasColumnType("decimal(18,2)").HasDefaultValue(0m);

            entity.HasOne<Category>()
                .WithMany()
                .HasForeignKey(e => e.CategoryId);
        });

        modelBuilder.Entity<Cart>(entity =>
        {
            entity.ToTable("carts");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(36);
            entity.Property(e => e.SessionId).HasColumnName("session_id").HasMaxLength(36);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Items)
                .WithOne(i => i.Cart)
                .HasForeignKey(i => i.CartId);
        });

        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.ToTable("cart_items");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CartId).HasColumnName("cart_id").HasMaxLength(36);
            entity.Property(e => e.ItemId).HasColumnName("item_id").HasMaxLength(36);
            entity.Property(e => e.NameEn).HasColumnName("name_en").HasMaxLength(255).IsRequired();
            entity.Property(e => e.NameAr).HasColumnName("name_ar").HasMaxLength(255).IsRequired();
            entity.Property(e => e.CategoryNameEn).HasColumnName("category_name_en").HasMaxLength(255).IsRequired();
            entity.Property(e => e.CategoryNameAr).HasColumnName("category_name_ar").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Image).HasColumnName("image").HasMaxLength(1024);
            entity.Property(e => e.Points).HasColumnName("points");
            entity.Property(e => e.Price).HasColumnName("price").HasColumnType("decimal(18,2)");
            entity.Property(e => e.MeasurementUnit).HasColumnName("measurement_unit");
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasColumnType("decimal(18,2)");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.ToTable("orders");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(36);
            entity.Property(e => e.AddressId).HasColumnName("address_id").HasMaxLength(36);
            entity.Property(e => e.CourierId).HasColumnName("courier_id").HasMaxLength(36);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.PaymentMethod).HasColumnName("payment_method").HasMaxLength(50);
            entity.Property(e => e.DeliveryFee).HasColumnName("delivery_fee").HasColumnType("decimal(18,2)").HasDefaultValue(0m);
            entity.Property(e => e.TotalAmount).HasColumnName("total_amount").HasColumnType("decimal(18,2)").HasDefaultValue(0m);
            entity.Property(e => e.HasQuantityAdjustments).HasColumnName("has_quantity_adjustments").HasDefaultValue(false);
            entity.Property(e => e.QuantityAdjustmentNotes).HasColumnName("quantity_adjustment_notes");
            entity.Property(e => e.EstimatedWeight).HasColumnName("estimated_weight").HasColumnType("decimal(18,2)");
            entity.Property(e => e.CollectedAt).HasColumnName("collected_at");
            entity.Property(e => e.CompletedAt).HasColumnName("completed_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasMany(e => e.Items)
                .WithOne(i => i.Order)
                .HasForeignKey(i => i.OrderId);

            entity.HasMany(e => e.StatusHistory)
                .WithOne(h => h.Order)
                .HasForeignKey(h => h.OrderId);

            entity.HasMany(e => e.DeliveryProofs)
                .WithOne(p => p.Order)
                .HasForeignKey(p => p.OrderId);
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.ToTable("order_items");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.OrderId).HasColumnName("order_id").HasMaxLength(36);
            entity.Property(e => e.ItemId).HasColumnName("item_id").HasMaxLength(36);
            entity.Property(e => e.CategoryId).HasColumnName("category_id").HasMaxLength(36);
            entity.Property(e => e.NameEn).HasColumnName("name_en").HasMaxLength(255).IsRequired();
            entity.Property(e => e.NameAr).HasColumnName("name_ar").HasMaxLength(255).IsRequired();
            entity.Property(e => e.CategoryNameEn).HasColumnName("category_name_en").HasMaxLength(255).IsRequired();
            entity.Property(e => e.CategoryNameAr).HasColumnName("category_name_ar").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Image).HasColumnName("image");
            entity.Property(e => e.MeasurementUnit).HasColumnName("measurement_unit");
            entity.Property(e => e.Points).HasColumnName("points");
            entity.Property(e => e.Price).HasColumnName("price").HasColumnType("decimal(18,2)");
            entity.Property(e => e.Quantity).HasColumnName("quantity").HasColumnType("decimal(18,2)");
            entity.Property(e => e.OriginalQuantity).HasColumnName("original_quantity").HasColumnType("decimal(18,2)");
            entity.Property(e => e.QuantityAdjusted).HasColumnName("quantity_adjusted").HasDefaultValue(false);
            entity.Property(e => e.Unit).HasColumnName("unit").HasMaxLength(20);
        });

        modelBuilder.Entity<OrderStatusHistory>(entity =>
        {
            entity.ToTable("order_status_history");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.OrderId).HasColumnName("order_id").HasMaxLength(36);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Timestamp).HasColumnName("timestamp");
            entity.Property(e => e.UpdatedBy).HasColumnName("updated_by").HasMaxLength(64);
            entity.Property(e => e.Notes).HasColumnName("notes");
        });

        modelBuilder.Entity<OrderDeliveryProof>(entity =>
        {
            entity.ToTable("order_delivery_proof");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.OrderId).HasColumnName("order_id").HasMaxLength(36);
            entity.Property(e => e.PhotoPath).HasColumnName("photo_path");
            entity.Property(e => e.PhotoUrl).HasColumnName("photo_url");
            entity.Property(e => e.UploadedAt).HasColumnName("uploaded_at");
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CompletedBy).HasColumnName("completed_by").HasMaxLength(36).IsRequired();
        });

        modelBuilder.Entity<OrderReview>(entity =>
        {
            entity.ToTable("order_reviews");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.OrderId).HasColumnName("order_id").HasMaxLength(450).IsRequired();
            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(450).IsRequired();
            entity.Property(e => e.CourierId).HasColumnName("courier_id").HasMaxLength(450);
            entity.Property(e => e.Stars).HasColumnName("stars");
            entity.Property(e => e.Comment).HasColumnName("comment");
            entity.Property(e => e.ReviewedAt).HasColumnName("reviewed_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(e => e.Order)
                .WithMany()
                .HasForeignKey(e => e.OrderId);
        });

        modelBuilder.Entity<UserPointsHistory>(entity =>
        {
            entity.ToTable("user_points_history");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(36);
            entity.Property(e => e.OrderId).HasColumnName("order_id").HasMaxLength(36);
            entity.Property(e => e.Points).HasColumnName("points");
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Reason).HasColumnName("reason").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Timestamp).HasColumnName("timestamp");
        });

        modelBuilder.Entity<Address>(entity =>
        {
            entity.ToTable("addresses");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(36);
            entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Area).HasColumnName("area").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Street).HasColumnName("street").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Building).HasColumnName("building").HasMaxLength(50);
            entity.Property(e => e.Floor).HasColumnName("floor").HasMaxLength(50);
            entity.Property(e => e.Apartment).HasColumnName("apartment").HasMaxLength(50);
            entity.Property(e => e.Landmark).HasColumnName("landmark").HasMaxLength(255);
            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(36);
            entity.Property(e => e.TitleEn).HasColumnName("title_en").HasMaxLength(255).IsRequired();
            entity.Property(e => e.TitleAr).HasColumnName("title_ar").HasMaxLength(255).IsRequired();
            entity.Property(e => e.BodyEn).HasColumnName("body_en").IsRequired();
            entity.Property(e => e.BodyAr).HasColumnName("body_ar").IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.OrderId).HasColumnName("order_id").HasMaxLength(36);
            entity.Property(e => e.DataJson).HasColumnName("data_json");
            entity.Property(e => e.IsRead).HasColumnName("is_read").HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<UserWallet>(entity =>
        {
            entity.ToTable("user_wallet");
            entity.HasKey(e => e.UserId);

            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(36);
            entity.Property(e => e.Balance).HasColumnName("balance").HasColumnType("decimal(18,2)").HasDefaultValue(0m);

            entity.HasOne(e => e.User)
                .WithOne()
                .HasForeignKey<UserWallet>(e => e.UserId);
        });

        modelBuilder.Entity<UserTransaction>(entity =>
        {
            entity.ToTable("user_transactions");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(36);
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Gateway).HasColumnName("gateway").HasMaxLength(50);
            entity.Property(e => e.Amount).HasColumnName("amount").HasColumnType("decimal(18,2)");
            entity.Property(e => e.TransactionDate).HasColumnName("transaction_date");

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId);
        });

        modelBuilder.Entity<Otp>(entity =>
        {
            entity.ToTable("otps");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Code).HasColumnName("code").HasMaxLength(20).IsRequired();
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.ToTable("sessions");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
            entity.Property(e => e.UserId).HasColumnName("user_id").HasMaxLength(36);
            entity.Property(e => e.SessionId).HasColumnName("session_token").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Device).HasColumnName("device").HasMaxLength(100);
            entity.Property(e => e.IpAddress).HasColumnName("ip_address").HasMaxLength(100);
            entity.Property(e => e.UserAgent).HasColumnName("user_agent").HasMaxLength(512);
            entity.Property(e => e.IsValid).HasColumnName("is_valid").HasDefaultValue(true);
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.LastUsedAt).HasColumnName("last_used_at");
        });

        modelBuilder.Entity<Subscriber>(entity =>
        {
            entity.ToTable("subscribers");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(e => e.SubscribedAt).HasColumnName("subscribed_at");
        });

        modelBuilder.Entity<Translation>(entity =>
        {
            entity.ToTable("translations");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasColumnName("id").HasMaxLength(36);
            entity.Property(e => e.TranslationKey).HasColumnName("key").HasMaxLength(255).IsRequired();
            entity.Property(e => e.ReferenceId).HasColumnName("reference_id").HasMaxLength(36);
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50);
            entity.Property(e => e.TranslationEn).HasColumnName("translation_en");
            entity.Property(e => e.TranslationAr).HasColumnName("translation_ar");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });
    }
}
