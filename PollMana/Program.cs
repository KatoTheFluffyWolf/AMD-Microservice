using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PollMana.Data;
using PollMana.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("myContext")
    ?? throw new InvalidOperationException("Connection string 'myContext' not found.");
var jwtKey = RequiredConfiguration(builder.Configuration, "Jwt:Key");
var jwtIssuer = RequiredConfiguration(builder.Configuration, "Jwt:Issuer");
var jwtAudience = RequiredConfiguration(builder.Configuration, "Jwt:Audience");

builder.Services.AddDbContext<PollContext>(options =>
    options.UseNpgsql(connectionString,
        npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory_Poll")));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1),
            NameClaimType = "name"
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<PollService>();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var frontendOrigins = (builder.Configuration["FrontendUrls"]
        ?? builder.Configuration["FrontendUrl"]
        ?? "http://localhost:5173")
    .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
    options.AddPolicy("VueClient", policy =>
        policy.WithOrigins(frontendOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseHttpsRedirection();
}

app.UseCors("VueClient");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

static string RequiredConfiguration(IConfiguration configuration, string key)
{
    var value = configuration[key];
    return !string.IsNullOrWhiteSpace(value)
        ? value
        : throw new InvalidOperationException($"{key} is not configured.");
}