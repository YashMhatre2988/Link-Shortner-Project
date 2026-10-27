using Microsoft.EntityFrameworkCore;
using UrlShortener.Api.Models;

namespace UrlShortener.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<ShortUrl> ShortUrls => Set<ShortUrl>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<ShortUrl>();
        entity.ToTable("short_urls");
        entity.HasKey(x => x.Id);
        entity.Property(x => x.OriginalUrl).HasMaxLength(2048).IsRequired();
        entity.Property(x => x.Code).HasMaxLength(32).IsRequired();
        entity.HasIndex(x => x.Code).IsUnique();
        entity.Property(x => x.CreatedAtUtc).IsRequired();
        entity.Property(x => x.ClickCount).HasDefaultValue(0L);
    }
}
