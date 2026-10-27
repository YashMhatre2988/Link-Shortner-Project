# Lik — URL Shortener (.NET + React + MySQL)

A full-stack URL shortener built with the stack in the supplied architecture table:

| Layer | Technologies |
|---|---|
| Frontend | React, Redux Toolkit |
| Backend | C#, ASP.NET Core Web API, Entity Framework Core |
| Database | MySQL |

## Features

- Create short links from long URLs.
- Optional custom alias (for example, `docs`).
- Redirect short links to their original URL.
- Track click counts and last-clicked time.
- List links created by the service.
- Copy the short URL from the UI.
- Validate URL input and reject unsafe/non-HTTP(S) schemes.
- Docker Compose setup for MySQL, API, and frontend.


## Architecture

```text
Browser
  |
  v
React + Redux Toolkit (Vite, port 5173)
  |
  | HTTP /api/urls
  v
ASP.NET Core Web API (port 8080)
  |
  | EF Core + Pomelo MySQL provider
  v
MySQL 8 (port 3306)
```

The API stores each original URL, a unique short code, creation time, click count, and last-click time. A redirect request looks up the code, increments its click count, and responds with HTTP 302 to the original URL.

## Project layout

```text
url-shortener-dotnet/
├── backend/
│   ├── UrlShortener.Api/
│   │   ├── Controllers/UrlsController.cs
│   │   ├── Data/AppDbContext.cs
│   │   ├── Dtos/
│   │   ├── Models/ShortUrl.cs
│   │   ├── Services/ShortCodeGenerator.cs
│   │   ├── Program.cs
│   │   ├── appsettings.json
│   │   └── UrlShortener.Api.csproj
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/store.js
│   │   ├── features/urls/urlsSlice.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

## Prerequisites

For local development, install:
- .NET 8 SDK
- Node.js 20 or newer and npm
- MySQL 8 (or use the Docker Compose database)

For container deployment, install Docker Desktop or Docker Engine with the Compose plugin.

## Option A — Run with Docker Compose (recommended)

1. Open a terminal in the project root.
2. Copy `.env.example` to `.env` if you want to customize settings. The compose file has demo defaults, so this is optional for local testing.
3. Start all services:

   ```bash
   docker compose up --build
   ```

4. Open the frontend at `http://localhost:5173`.
5. API health endpoint: `http://localhost:8080/health`.
6. Swagger UI: `http://localhost:8080/swagger` (development only).

Stop the services:

```bash
docker compose down
```

Stop and delete the database volume (this permanently deletes stored links):

```bash
docker compose down -v
```

The database uses a named volume so links persist when containers are restarted.

### Environment variables

| Variable | Purpose | Docker default |
|---|---|---|
| `MYSQL_DATABASE` | Database name | `urlshortener` |
| `MYSQL_USER` | Application DB user | `urlapp` |
| `MYSQL_PASSWORD` | Application DB password | `urlapp_dev_password` |
| `MYSQL_ROOT_PASSWORD` | MySQL root password | `root_dev_password` |
| `ConnectionStrings__DefaultConnection` | API connection string | Set by Compose |
| `ASPNETCORE_URLS` | API bind address | `http://+:8080` |
| `VITE_API_BASE_URL` | Browser-facing API base URL | `http://localhost:8080` |

**Before public deployment:** replace all sample passwords, store secrets in your hosting provider's secret manager, use HTTPS, configure a public domain, and restrict database access. Do not commit `.env` files or production secrets.

## Option B — Run locally without Docker

### 1. Create the MySQL database

Create a database and a dedicated user. Example (change the password):

```sql
CREATE DATABASE urlshortener CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'urlapp'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
GRANT ALL PRIVILEGES ON urlshortener.* TO 'urlapp'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Start the backend

```bash
cd backend/UrlShortener.Api
```

Set the connection string using an environment variable (PowerShell):

```powershell
$env:ConnectionStrings__DefaultConnection="Server=localhost;Port=3306;Database=urlshortener;User=urlapp;Password=replace-with-a-strong-password;"
$env:ASPNETCORE_URLS="http://localhost:8080"
dotnet restore
dotnet run
```

On bash/zsh:

```bash
export ConnectionStrings__DefaultConnection='Server=localhost;Port=3306;Database=urlshortener;User=urlapp;Password=replace-with-a-strong-password;'
export ASPNETCORE_URLS='http://localhost:8080'
dotnet restore
dotnet run
```

The application creates the table at startup using `EnsureCreated()` for simple demo setup. For a production application, use EF Core migrations (`dotnet ef migrations add InitialCreate` and `dotnet ef database update`) rather than `EnsureCreated()`.

The API listens on `http://localhost:8080`; Swagger is available at `/swagger` in Development.

### 3. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite development proxy forwards `/api` and `/health` to `http://localhost:8080`. If your API uses a different host, set `VITE_API_BASE_URL` before starting the frontend.

## API reference

Base URL: `http://localhost:8080`

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/api/urls` | List the latest 100 short links |
| `GET` | `/api/urls/{code}` | Return metadata for one code |
| `POST` | `/api/urls` | Create a short link |
| `GET` | `/{code}` | Redirect to the original URL (302) |

### Create a short URL

Request:

```http
POST /api/urls
Content-Type: application/json

{
  "originalUrl": "https://example.com/a/long/path?campaign=spring",
  "customAlias": "spring"
}
```

Example response:

```json
{
  "id": 1,
  "originalUrl": "https://example.com/a/long/path?campaign=spring",
  "code": "spring",
  "shortUrl": "http://localhost:8080/spring",
  "createdAtUtc": "2026-01-01T10:00:00Z",
  "clickCount": 0,
  "lastClickedAtUtc": null
}
```

If `customAlias` is omitted, the API generates a random 7-character code. Aliases can contain letters, digits, `_` and `-` and must be 3–32 characters long.

Example redirect test:

```bash
curl -i http://localhost:8080/spring
```

A successful redirect responds with status `302 Found` and a `Location` header pointing to the original URL.

## Implementation walkthrough

### Backend

1. **Model (`Models/ShortUrl.cs`)** — Entity Framework maps each short link to a MySQL row.
2. **DbContext (`Data/AppDbContext.cs`)** — configures the table, unique code index, and maximum field sizes.
3. **Short-code generator (`Services/ShortCodeGenerator.cs`)** — produces URL-friendly random codes. The database unique index is the final protection against duplicate codes.
4. **DTOs (`Dtos/`)** — define the input and output API contracts rather than exposing the database entity directly.
5. **Controller (`Controllers/UrlsController.cs`)** — validates input, creates links, lists links, returns metadata, and handles redirects.
6. **Program.cs** — configures MySQL, dependency injection, CORS, Swagger, and database initialization.

### Frontend

1. **React** renders the create form and link list.
2. **Redux Toolkit** stores the list and request status in a centralized slice.
3. The form sends a `POST /api/urls` request.
4. The UI displays the generated short link and click count, and provides a copy button.
5. Vite proxies API requests during local development.

## Deployment checklist

1. Push the project to a Git repository.
2. Choose a host that supports Docker containers (or deploy the API and frontend separately).
3. Set secure production environment variables; never use the sample credentials.
4. Provision managed MySQL or a private MySQL container with persistent storage and backups.
5. Set `ConnectionStrings__DefaultConnection` on the API host.
6. Set the frontend's `VITE_API_BASE_URL` to the public HTTPS API URL at build time if frontend and API are hosted separately.
7. Configure allowed CORS origins in `Program.cs` to your actual frontend domain.
8. Add a custom domain and TLS certificate.
9. Configure logging, health checks, backups, rate limiting, monitoring, and alerting.
10. Test link creation, duplicate aliases, invalid URLs, and redirects before opening it to users.

### Production considerations

- Use EF Core migrations instead of `EnsureCreated()`.
- Add rate limiting, authentication/ownership if links are private, abuse detection, URL reputation checks, and a takedown mechanism.
- Avoid redirecting to non-HTTP(S) schemes. This project validates `http` and `https` only.
- Consider restricting private/internal IP destinations and checking DNS rebinding if you add URL previews or server-side fetching.
- Use a cryptographically secure random generator and handle uniqueness conflicts.
- Consider a dedicated domain for short links. If the API is behind a reverse proxy, configure forwarded headers and ensure the generated `shortUrl` uses the public origin.

## Troubleshooting

- **API cannot connect to MySQL:** check that the database service is healthy, credentials match, and the API uses host `mysql` inside Docker (not `localhost`).
- **Frontend cannot reach API:** verify `VITE_API_BASE_URL` and the browser's network tab. Vite proxy settings apply only to the development server.
- **Port already in use:** change the host-side port mapping in `docker-compose.yml`.
- **Swagger not visible:** it is enabled only in Development.
- **Custom alias already exists:** choose a different alias; codes are unique.
- **MySQL first boot takes time:** Compose health checks delay API startup until MySQL is ready.

