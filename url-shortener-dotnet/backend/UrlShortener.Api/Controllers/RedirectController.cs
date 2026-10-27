using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UrlShortener.Api.Data;

namespace UrlShortener.Api.Controllers;

[ApiController]
public sealed class RedirectController(AppDbContext db) : ControllerBase
{
    [HttpGet("/{code}")]
    public async Task<IActionResult> RedirectToOriginal(string code, CancellationToken cancellationToken)
    {
        if (code.Equals("swagger", StringComparison.OrdinalIgnoreCase) ||
            code.Equals("health", StringComparison.OrdinalIgnoreCase))
            return NotFound();

        var row = await db.ShortUrls.SingleOrDefaultAsync(x => x.Code == code, cancellationToken);
        if (row is null) return NotFound(new { message = "Short link not found." });

        row.ClickCount++;
        row.LastClickedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return Redirect(row.OriginalUrl);
    }
}
