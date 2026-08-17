using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PollMana.Data;
using PollMana.Services;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("myContext") ?? throw new InvalidOperationException("Connection string 'myContext' not found.");
builder.Services.AddDbContext<PollContext>(options => options.UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory_Poll")));
var authAuthority = builder.Configuration["Authentication:Authority"]?.TrimEnd('/');
var authAudience = builder.Configuration["Authentication:Audience"];
if (string.IsNullOrWhiteSpace(authAuthority)) throw new InvalidOperationException("Authentication:Authority is not configured.");
if (string.IsNullOrWhiteSpace(authAudience)) throw new InvalidOperationException("Authentication:Audience is not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.Authority = authAuthority;
    options.Audience = authAudience;
    options.RequireHttpsMetadata = true;
    options.MapInboundClaims = false;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
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
builder.Services.AddCors(options => options.AddPolicy("VueClient", policy => policy.WithOrigins(frontendOrigins).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseHttpsRedirection();
}
app.UseCors("VueClient"); app.UseAuthentication(); app.UseAuthorization(); app.MapControllers(); app.Run();
