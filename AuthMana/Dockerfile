FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY ["AuthMana/AuthMana.csproj", "AuthMana/"]
RUN dotnet restore "AuthMana/AuthMana.csproj"

COPY . .

WORKDIR "/src/AuthMana"

RUN dotnet publish "AuthMana.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore


FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:10000

EXPOSE 10000

ENTRYPOINT ["dotnet", "AuthMana.dll"]