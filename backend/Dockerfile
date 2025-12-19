# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Recycling.Backend.Net.sln ./
COPY src/Api/Recycling.Api.csproj src/Api/
COPY src/Application/Recycling.Application.csproj src/Application/
COPY src/Domain/Recycling.Domain.csproj src/Domain/
COPY src/Infrastructure/Recycling.Infrastructure.csproj src/Infrastructure/

RUN dotnet restore "src/Api/Recycling.Api.csproj"

COPY . .
RUN dotnet publish "src/Api/Recycling.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production

# Railway sets PORT; default to 8080 locally.
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} dotnet Recycling.Api.dll"]
