using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UrlShortener.Api.Data;
using UrlShortener.Api.Dtos;
using UrlShortener.Api.Models;
using UrlShortener.Api.Services;

namespace UrlShortener.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class UrlsController(
    AppDbContext db,
    ShortCodeGenerator codeGenerator,
    IConfiguration configuration,
    IHttpContextAccessor httpContextAccessor) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ShortUrlResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<ShortUrlResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var rows = await db.ShortUrls.AsNoTracking()
            .OrderByDescending(x => x.CreatedAtUtc).Take(100).ToListAsync(cancellationToken);
        return Ok(rows.Select(ToResponse));
    }

    [HttpGet("{code}")]
    public async Task<ActionResult<ShortUrlResponse>> GetByCode(string code, CancellationToken cancellationToken)
    {
        var row = await db.ShortUrls.AsNoTracking().SingleOrDefaultAsync(x => x.Code == code, cancellationToken);
        return row is null ? NotFound(new { message = "Short link not found." }) : Ok(ToResponse(row));
    }

    [HttpPost]
    public async Task<ActionResult<ShortUrlResponse>> Create(
        [FromBody] CreateShortUrlRequest request, CancellationToken cancellationToken)
    {
        if (!Uri.TryCreate(request.OriginalUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            return BadRequest(new { message = "Enter a valid absolute HTTP or HTTPS URL." });

        var code = string.IsNullOrWhiteSpace(request.CustomAlias)
            ? codeGenerator.Generate()
            : request.CustomAlias.Trim();

        if (await db.ShortUrls.AnyAsync(x => x.Code == code, cancellationToken))
            return Conflict(new { message = "That short code is already in use. Choose another alias." });

        var row = new ShortUrl
        {
            OriginalUrl = uri.AbsoluteUri,
            Code = code,
            CreatedAtUtc = DateTime.UtcNow,
            ClickCount = 0
        };
        db.ShortUrls.Add(row);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // The unique database index protects against concurrent duplicate aliases.
            return Conflict(new { message = "That short code is already in use. Choose another alias." });
        }

        return CreatedAtAction(nameof(GetByCode), new { code }, ToResponse(row));
    }

    private ShortUrlResponse ToResponse(ShortUrl row)
    {
        var configuredBase = configuration["PublicBaseUrl"];
        var baseUrl = !string.IsNullOrWhiteSpace(configuredBase)
            ? configuredBase.TrimEnd('/')
            : $"{Request.Scheme}://{Request.Host}";
        return new ShortUrlResponse(row.Id, row.OriginalUrl, row.Code,
            $"{baseUrl}/{Uri.EscapeDataString(row.Code)}", row.CreatedAtUtc,
            row.ClickCount, row.LastClickedAtUtc);
    }
}
