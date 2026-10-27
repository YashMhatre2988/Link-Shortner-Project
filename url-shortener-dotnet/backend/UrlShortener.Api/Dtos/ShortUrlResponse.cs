namespace UrlShortener.Api.Dtos;

public sealed record ShortUrlResponse(
    long Id,
    string OriginalUrl,
    string Code,
    string ShortUrl,
    DateTime CreatedAtUtc,
    long ClickCount,
    DateTime? LastClickedAtUtc);
