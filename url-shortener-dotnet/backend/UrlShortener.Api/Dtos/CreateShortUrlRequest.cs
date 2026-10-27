using System.ComponentModel.DataAnnotations;

namespace UrlShortener.Api.Dtos;

public sealed class CreateShortUrlRequest
{
    [Required]
    [StringLength(2048, MinimumLength = 8)]
    public string OriginalUrl { get; init; } = string.Empty;

    [StringLength(32, MinimumLength = 3)]
    [RegularExpression(@"^[a-zA-Z0-9_-]+$", ErrorMessage = "Alias can contain letters, digits, hyphen and underscore only.")]
    public string? CustomAlias { get; init; }
}
