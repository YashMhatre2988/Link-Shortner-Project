FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY UrlShortener.Api/UrlShortener.Api.csproj UrlShortener.Api/
RUN dotnet restore UrlShortener.Api/UrlShortener.Api.csproj
COPY UrlShortener.Api/ UrlShortener.Api/
RUN dotnet publish UrlShortener.Api/UrlShortener.Api.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "UrlShortener.Api.dll"]
