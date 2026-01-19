using Microsoft.EntityFrameworkCore;
using SubscribeTracker.Api.Domain.Entities;

namespace SubscribeTracker.Api.Infrastructure;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<SubscriptionEvent> SubscriptionEvents => Set<SubscriptionEvent>();
    public DbSet<SyncJob> SyncJobs => Set<SyncJob>();
    public DbSet<UserToken> UserTokens => Set<UserToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProviderUserId).HasMaxLength(255).IsRequired();
            entity.HasIndex(e => e.ProviderUserId).IsUnique();
            entity.Property(e => e.EmailDomainHash).HasMaxLength(64);
            entity.HasQueryFilter(e => e.DeletedAt == null); // Soft delete
        });

        // Subscription
        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.ToTable("subscriptions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.MerchantName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.MerchantDomain).HasMaxLength(255);
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.Property(e => e.Currency).HasMaxLength(3).HasDefaultValue("USD");
            entity.Property(e => e.Cadence).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.ExtractionMethod).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.NextBillingDate);
            
            entity.HasOne(e => e.User)
                .WithMany(u => u.Subscriptions)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // SubscriptionEvent
        modelBuilder.Entity<SubscriptionEvent>(entity =>
        {
            entity.ToTable("subscription_events");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.ProviderMessageId).HasMaxLength(255).IsRequired();
            entity.Property(e => e.EventType).HasConversion<string>().HasMaxLength(30);
            entity.Property(e => e.Amount).HasPrecision(12, 2);
            entity.Property(e => e.Currency).HasMaxLength(3);
            entity.Property(e => e.ReasonCode).HasMaxLength(100).IsRequired();
            entity.Property(e => e.ExtractionMethod).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => e.SubscriptionId);
            entity.HasIndex(e => e.ProviderMessageId);
            entity.HasIndex(e => new { e.SubscriptionId, e.ProviderMessageId }).IsUnique();
            
            entity.HasOne(e => e.Subscription)
                .WithMany(s => s.Events)
                .HasForeignKey(e => e.SubscriptionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // SyncJob
        modelBuilder.Entity<SyncJob>(entity =>
        {
            entity.ToTable("sync_jobs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.JobType).HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(e => new { e.UserId, e.Status });
            
            entity.HasOne(e => e.User)
                .WithMany(u => u.SyncJobs)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // UserToken
        modelBuilder.Entity<UserToken>(entity =>
        {
            entity.ToTable("user_tokens");
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.AccessTokenEncrypted).IsRequired();
            entity.Property(e => e.RefreshTokenEncrypted).IsRequired();
            
            entity.HasOne(e => e.User)
                .WithOne(u => u.Token)
                .HasForeignKey<UserToken>(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Apply snake_case naming convention for PostgreSQL (must be after all entity configs)
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }
            foreach (var key in entity.GetKeys())
            {
                key.SetName(ToSnakeCase(key.GetName()!));
            }
            foreach (var fk in entity.GetForeignKeys())
            {
                fk.SetConstraintName(ToSnakeCase(fk.GetConstraintName()!));
            }
            foreach (var index in entity.GetIndexes())
            {
                index.SetDatabaseName(ToSnakeCase(index.GetDatabaseName()!));
            }
        }
    }

    private static string ToSnakeCase(string name)
    {
        if (string.IsNullOrEmpty(name)) return name;
        
        var result = new System.Text.StringBuilder();
        for (int i = 0; i < name.Length; i++)
        {
            var c = name[i];
            if (char.IsUpper(c))
            {
                if (i > 0) result.Append('_');
                result.Append(char.ToLowerInvariant(c));
            }
            else
            {
                result.Append(c);
            }
        }
        return result.ToString();
    }
}
