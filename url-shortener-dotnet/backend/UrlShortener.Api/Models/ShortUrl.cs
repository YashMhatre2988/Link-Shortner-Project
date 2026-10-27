namespace UrlShortener.Api.Models;

public sealed class ShortUrl
{
    public long Id { get; set; }
    public required string OriginalUrl { get; set; }
    public required string Code { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public long ClickCount { get; set; }
    public DateTime? LastClickedAtUtc { get; set; }
}
