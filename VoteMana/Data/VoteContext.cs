using Microsoft.EntityFrameworkCore;
using VoteMana.Models;

namespace VoteMana.Data;

public class VoteContext : DbContext
{
    public VoteContext(DbContextOptions<VoteContext> options) : base(options) { }
    public DbSet<Vote> Votes => Set<Vote>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<UserReference>(entity =>
        {
            entity.ToTable("AspNetUsers", t => t.ExcludeFromMigrations());
            entity.HasKey(x => x.UserID);
            entity.Property(x => x.UserID).HasColumnName("UserID");
        });

        modelBuilder.Entity<PollReference>(entity =>
        {
            entity.ToTable("Polls", t => t.ExcludeFromMigrations());
            entity.HasKey(x => x.PollID);
        });

        modelBuilder.Entity<PollOptionReference>(entity =>
        {
            entity.ToTable("PollOptions", t => t.ExcludeFromMigrations());
            entity.HasKey(x => x.PollOptionID);
            entity.Property(x => x.PollOptionID).HasColumnName("OptionID");
            entity.HasAlternateKey(x => new { x.PollID, x.PollOptionID });
        });

        modelBuilder.Entity<Vote>(entity =>
        {
            entity.ToTable("Vote");
            entity.HasKey(v => v.VoteID);
            entity.Property(v => v.VoteID).UseIdentityByDefaultColumn();
            entity.Property(v => v.UserID).IsRequired();
            entity.Property(v => v.VotedAt).HasDefaultValueSql("NOW()");
            entity.HasIndex(v => new { v.PollID, v.UserID }).IsUnique();
            entity.HasOne(v => v.User).WithMany().HasForeignKey(v => v.UserID).HasPrincipalKey(u => u.UserID).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(v => v.Poll).WithMany().HasForeignKey(v => v.PollID).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(v => v.PollOption).WithMany().HasForeignKey(v => new { v.PollID, v.PollOptionID }).HasPrincipalKey(o => new { o.PollID, o.PollOptionID }).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
