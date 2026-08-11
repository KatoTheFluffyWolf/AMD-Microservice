FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY ["PollMana/PollMana.csproj", "PollMana/"]
RUN dotnet restore "PollMana/PollMana.csproj"

COPY . .

WORKDIR "/src/PollMana"

RUN dotnet publish "PollMana.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore


FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:10000

EXPOSE 10000

ENTRYPOINT ["dotnet", "PollMana.dll"]