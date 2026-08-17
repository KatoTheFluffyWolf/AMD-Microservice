using Microsoft.EntityFrameworkCore;
using VoteMana.Data;
using VoteMana.Hubs;
using VoteMana.Services;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("myContext") ?? throw new InvalidOperationException("Connection string 'myContext' not found.");
builder.Services.AddDbContext<VoteContext>(options => options.UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory_Vote")));
var gatewayBaseUrl = builder.Configuration["ServiceEndpoints:ApiGatewayBaseUrl"] ?? throw new InvalidOperationException("ServiceEndpoints:ApiGatewayBaseUrl is not configured.");
builder.Services.AddHttpClient<PollServiceClient>(client => client.BaseAddress = new Uri(gatewayBaseUrl));
builder.Services.AddScoped<VoteService>();
builder.Services.AddScoped<ResultService>();
builder.Services.AddSignalR();
builder.Services.AddControllers();
builder.Services.AddOpenApi();
var frontendOrigins = (builder.Configuration["FrontendUrls"]
        ?? builder.Configuration["FrontendUrl"]
        ?? "http://localhost:5173")
    .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options => options.AddPolicy("VueClient", policy => policy.WithOrigins(frontendOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseHttpsRedirection();
}
app.UseCors("VueClient"); app.MapControllers(); app.MapHub<PollHub>("/hubs/poll"); app.Run();
