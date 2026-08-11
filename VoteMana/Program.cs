using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using VoteMana.Data;
using VoteMana.Hubs;
using VoteMana.Services;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("myContext") ?? throw new InvalidOperationException("Connection string 'myContext' not found.");
builder.Services.AddDbContext<VoteContext>(options => options.UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory_Vote")));
var gatewayBaseUrl = builder.Configuration["ServiceEndpoints:ApiGatewayBaseUrl"] ?? throw new InvalidOperationException("ServiceEndpoints:ApiGatewayBaseUrl is not configured.");
builder.Services.AddHttpClient<PollServiceClient>(client => client.BaseAddress = new Uri(gatewayBaseUrl));
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options => options.TokenValidationParameters = new TokenValidationParameters
{
    ValidateIssuer = true, ValidateAudience = true, ValidateLifetime = true, ValidateIssuerSigningKey = true,
    ValidIssuer = builder.Configuration["Jwt:Issuer"], ValidAudience = builder.Configuration["Jwt:Audience"],
    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
});
builder.Services.AddAuthorization();
builder.Services.AddScoped<VoteService>();
builder.Services.AddScoped<ResultService>();
builder.Services.AddSignalR();
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddCors(options => options.AddPolicy("VueDev", policy => policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseHttpsRedirection();
}
app.UseCors("VueDev"); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers(); app.MapHub<PollHub>("/hubs/poll"); app.Run();
