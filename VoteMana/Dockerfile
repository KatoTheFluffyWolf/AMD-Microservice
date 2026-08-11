FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build

WORKDIR /src

COPY ["VoteMana/VoteMana.csproj", "VoteMana/"]
RUN dotnet restore "VoteMana/VoteMana.csproj"

COPY . .

WORKDIR "/src/VoteMana"

RUN dotnet publish "VoteMana.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore


FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:10000

EXPOSE 10000

ENTRYPOINT ["dotnet", "VoteMana.dll"]