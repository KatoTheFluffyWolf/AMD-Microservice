using Microsoft.EntityFrameworkCore;
using PollMana.Models;

namespace PollMana.Data;

public class PollContext : DbContext
{
    public PollContext(DbContextOptions<PollContext> options) : base(options) { }
    public DbSet<Poll> Polls => Set<Poll>();
    public DbSet<PollOption> PollOptions => Set<PollOption>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserReference>(entity =>
        {
            entity.ToTable("AspNetUsers", t => t.ExcludeFromMigrations());
            entity.HasKey(u => u.UserID);
            entity.Property(u => u.UserID).HasColumnName("UserID");
        });

        modelBuilder.Entity<Poll>(entity =>
        {
            entity.ToTable("Polls");
            entity.HasKey(p => p.PollID);
            entity.Property(p => p.PollID).UseIdentityByDefaultColumn();
            entity.Property(p => p.Url).HasMaxLength(8).IsRequired();
            entity.HasIndex(p => p.Url).IsUnique();
            entity.Property(p => p.Question).HasMaxLength(500).IsRequired();
            entity.Property(p => p.CreatorUserID).IsRequired();
            entity.Property(p => p.IsClosed).HasDefaultValue(false);
            entity.Property(p => p.CreatedAt).HasDefaultValueSql("NOW()");
            entity.HasOne(p => p.Creator).WithMany().HasForeignKey(p => p.CreatorUserID).HasPrincipalKey(u => u.UserID).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PollOption>(entity =>
        {
            entity.ToTable("PollOptions", table => table.HasCheckConstraint("CHK_PollOptions_OptionIndex", "\"OptionIndex\" BETWEEN 0 AND 5"));
            entity.HasKey(o => o.OptionID);
            entity.Property(o => o.OptionID).UseIdentityByDefaultColumn();
            entity.Property(o => o.OptionText).HasMaxLength(200).IsRequired();
            entity.HasIndex(o => new { o.PollID, o.OptionIndex }).IsUnique();
            entity.HasAlternateKey(o => new { o.PollID, o.OptionID });
            entity.HasOne(o => o.Poll).WithMany(p => p.Options).HasForeignKey(o => o.PollID).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
