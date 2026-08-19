using AuthMana.Models;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace AuthMana.Services;

public class JwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string CreateToken(ApplicationUser user)
    {
        var key = RequiredConfiguration("Jwt:Key");
        var issuer = RequiredConfiguration("Jwt:Issuer");
        var audience = RequiredConfiguration("Jwt:Audience");
        var expiryMinutes = ExpiryMinutes();

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Name, user.UserName ?? string.Empty),
            new(ClaimTypes.Email, user.Email ?? string.Empty)
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string RequiredConfiguration(string key)
    {
        var value = _configuration[key];
        return !string.IsNullOrWhiteSpace(value)
            ? value
            : throw new InvalidOperationException($"{key} is not configured.");
    }

    private int ExpiryMinutes()
    {
        var configuredValue = _configuration["Jwt:ExpiryMinutes"];
        if (string.IsNullOrWhiteSpace(configuredValue)) return 120;

        if (int.TryParse(configuredValue, out var expiryMinutes) && expiryMinutes > 0)
            return expiryMinutes;

        throw new InvalidOperationException("Jwt:ExpiryMinutes must be a positive integer.");
    }
}