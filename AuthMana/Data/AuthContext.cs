using AuthMana.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AuthMana.Data;

public class AuthContext : IdentityDbContext<ApplicationUser>
{
    public AuthContext(DbContextOptions<AuthContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<ApplicationUser>(entity =>
        {
            entity.ToTable("AspNetUsers");
            entity.Property(u => u.Id).HasColumnName("UserID");
            entity.Property(u => u.UserName).HasMaxLength(100);
            entity.Property(u => u.Email).HasMaxLength(255);
            entity.HasIndex(u => u.NormalizedEmail).IsUnique();
        });
    }
}
